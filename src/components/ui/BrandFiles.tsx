import { useEffect, useRef, useState } from 'react';
import {
  downloadBrandPriceList,
  downloadBrandPriceListText,
  listBrandPriceLists,
  trainBrandPriceListIntoClaude,
} from '../../api/companies';
import { ingestPriceListDocument } from '../../api/priceList';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { pollIngestJobs, registerIngest, pushToast } from '../../store/ingestJobsSlice';
import type { IngestStatus, ProductDocument } from '../../types';
import Badge from './Badge';
import { confirmDialog } from './Dialog';
import { DownloadIcon, FileIcon, PlusIcon, RefreshIcon, TrashIcon } from '../icons';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt';

/** A file already saved on the brand, with the form's pending changes to it. */
export interface ExistingFile {
  doc: ProductDocument;
  /** Label for the file, e.g. "Price list 1". */
  name: string;
  train: boolean;
  /** Marked for removal — deleted when the form is saved. */
  remove: boolean;
}

/** A file picked in the form but not uploaded yet. */
export interface NewFile {
  key: string;
  file: File;
  name: string;
  train: boolean;
}

export const toExistingFiles = (docs: ProductDocument[]): ExistingFile[] =>
  docs.map((doc) => ({ doc, name: doc.name ?? '', train: doc.train ?? true, remove: false }));

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Tone = 'gray' | 'green' | 'amber' | 'red';
const STATUS_TONE: Record<IngestStatus, Tone> = {
  COMPLETED: 'green',
  PROCESSING: 'amber',
  FAILED: 'red',
  NOT_STARTED: 'gray',
};
const STATUS_LABEL: Record<IngestStatus, string> = {
  COMPLETED: 'trained',
  PROCESSING: 'training…',
  FAILED: 'training failed',
  NOT_STARTED: 'not trained',
};
// Reading the file into stored text (a COMPLETED file shows its character count).
const TEXT_TONE: Record<IngestStatus, Tone> = {
  COMPLETED: 'gray',
  PROCESSING: 'amber',
  FAILED: 'red',
  NOT_STARTED: 'gray',
};
const TEXT_LABEL: Record<IngestStatus, string> = {
  COMPLETED: 'no text found',
  PROCESSING: 'extracting…',
  FAILED: 'text failed',
  NOT_STARTED: 'not extracted',
};

interface Props {
  /** Brand id — needed to download saved files (absent while creating). */
  companyId?: number;
  existing: ExistingFile[];
  added?: NewFile[];
  /** Shown in a toolbar above the table, with the "Add file" button beside it. */
  title?: string;
  /** View pages pass true: no add/remove, and the Train boxes are locked. */
  readOnly?: boolean;
  onExistingChange?: (next: ExistingFile[]) => void;
  onAddedChange?: (next: NewFile[]) => void;
}

/**
 * A brand's files, one row each with a name and a "Train" checkbox. A trained file is
 * parsed into the catalogue Get Quote matches against; an untrained one is only
 * kept with the brand. Changes here are pending until the form is saved —
 * training itself runs in the background (status comes from the IngestWatcher).
 */
export default function BrandFiles({
  companyId,
  existing,
  added = [],
  title,
  readOnly = false,
  onExistingChange,
  onAddedChange,
}: Props) {
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const jobsById = useAppSelector((s) => s.ingestJobs.byId);
  // Claude engine: "trained" means the file is in Claude (has a file id) — the
  // Training column shows that state and "Train again" re-uploads it.
  const claudeEngine = useAppSelector((s) => s.llmStatus.status?.quoteEngine) === 'claude';
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patchExisting = (docId: number, patch: Partial<ExistingFile>) =>
    onExistingChange?.(existing.map((e) => (e.doc.id === docId ? { ...e, ...patch } : e)));

  // While any file is uploading to Claude, refresh the rows every few seconds so
  // the status (and the file id Claude returned) appears without a reload.
  const uploading = existing.some((e) => e.doc.aiStatus === 'PROCESSING');
  const existingRef = useRef(existing);
  existingRef.current = existing;
  useEffect(() => {
    if (!uploading || companyId == null) return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await listBrandPriceLists(companyId);
        const byId = new Map(fresh.map((d) => [d.id, d]));
        onExistingChange?.(
          existingRef.current.map((e) => {
            const d = byId.get(e.doc.id);
            return d ? { ...e, doc: { ...e.doc, ...d } } : e;
          }),
        );
      } catch {
        /* next tick */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [uploading, companyId, onExistingChange]);

  const trainClaude = async (doc: ProductDocument) => {
    if (companyId == null) return;
    const trained = doc.aiStatus === 'COMPLETED';
    const ok = await confirmDialog({
      title: trained ? 'Train file again' : 'Train file',
      tone: 'primary',
      confirmLabel: trained ? 'Train again' : 'Train',
      message: trained
        ? `Train "${doc.name || doc.fileName}" into Claude again? The copy in Claude is replaced and a new file id is issued.`
        : `Train "${doc.name || doc.fileName}" into Claude? Its text is uploaded to Claude and the file id is kept here.`,
    });
    if (!ok) return;
    setError('');
    try {
      const updated = await trainBrandPriceListIntoClaude(companyId, doc.id);
      patchExisting(doc.id, { doc: { ...doc, ...updated } });
      dispatch(pushToast({ tone: 'info', message: `Training started — “${doc.fileName}”.` }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start training'));
    }
  };
  const patchAdded = (key: string, patch: Partial<NewFile>) =>
    onAddedChange?.(added.map((a) => (a.key === key ? { ...a, ...patch } : a)));

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const seen = new Set(added.map((a) => a.key));
    const count = existing.length + added.length;
    const picked = Array.from(list)
      .map((file) => ({ key: `${file.name}:${file.size}:${file.lastModified}`, file }))
      .filter((a) => !seen.has(a.key))
      .map((a, i) => ({ ...a, name: `Price list ${count + i + 1}`, train: true }));
    onAddedChange?.([...added, ...picked]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (doc: ProductDocument) => {
    if (companyId == null) return;
    try {
      await downloadBrandPriceList(companyId, doc.id, doc.fileName);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not download the file'));
    }
  };

  const handleDownloadText = async (doc: ProductDocument) => {
    if (companyId == null) return;
    try {
      await downloadBrandPriceListText(companyId, doc.id, doc.fileName);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not download the text'));
    }
  };

  const retrain = async (doc: ProductDocument) => {
    const ok = await confirmDialog({
      title: 'Train file again',
      tone: 'primary',
      confirmLabel: 'Train again',
      message: `Train "${doc.name || doc.fileName}" again? Its catalogue rows are re-read from the file and replaced.`,
    });
    if (!ok) return;
    setError('');
    try {
      await ingestPriceListDocument(doc.id);
      dispatch(registerIngest({ docId: doc.id, categoryId: null, fileName: doc.fileName }));
      dispatch(pushToast({ tone: 'info', message: `Training started — “${doc.fileName}”.` }));
      void dispatch(pollIngestJobs());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start training'));
    }
  };

  const empty = existing.length === 0 && added.length === 0;

  return (
    <div>
      {(title || !readOnly) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{title ?? ''}</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary btn-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Add file
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {empty ? (
        <p className="py-2 text-sm text-slate-400">No reference files added yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Text</th>
                <th className="px-3 py-2">Training</th>
                <th className="px-3 py-2 text-center">Train</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {existing.map((e) => {
                const { doc } = e;
                const job = jobsById[doc.id];
                const status: IngestStatus = job?.ingestStatus ?? doc.ingestStatus ?? 'NOT_STARTED';
                const itemCount = job?.ingestedItemCount ?? doc.ingestedItemCount ?? 0;
                const failure = job?.ingestError ?? doc.ingestError ?? undefined;
                const textStatus: IngestStatus = job?.textStatus ?? doc.textStatus ?? 'NOT_STARTED';
                const textChars = job?.textChars ?? doc.textChars ?? 0;
                const textFailure = job?.textError ?? doc.textError ?? undefined;
                const readByAi = (job?.textSource ?? doc.textSource) === 'AI';
                const aiStatus: IngestStatus = doc.aiStatus ?? 'NOT_STARTED';
                return (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <span className="font-medium text-slate-800">
                          {e.name || <span className="font-normal text-slate-400">—</span>}
                        </span>
                      ) : (
                        <input
                          className="input w-48"
                          value={e.name}
                          disabled={e.remove}
                          onChange={(ev) => patchExisting(doc.id, { name: ev.target.value })}
                          placeholder="e.g. Price list 1"
                          maxLength={150}
                          aria-label={`Name of ${doc.fileName}`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span
                          className={`truncate ${e.remove ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                      {formatSize(doc.sizeBytes)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {textStatus === 'COMPLETED' && textChars > 0 && companyId != null ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadText(doc)}
                          title={
                            readByAi
                              ? 'Scan/image read by AI. Click to download the text (.txt)'
                              : 'Click to download the extracted text (.txt)'
                          }
                        >
                          <Badge tone="green">
                            {textChars.toLocaleString()} chars{readByAi ? ' · AI' : ''}
                          </Badge>
                        </button>
                      ) : (
                        <span
                          title={
                            textStatus === 'FAILED'
                              ? textFailure
                              : textStatus === 'COMPLETED'
                                ? 'No text was found in this file.'
                                : undefined
                          }
                        >
                          <Badge tone={TEXT_TONE[textStatus]}>
                            {textStatus === 'COMPLETED' ? 'no text found' : TEXT_LABEL[textStatus]}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {e.remove ? (
                        <Badge tone="red">will be removed</Badge>
                      ) : claudeEngine ? (
                        // Claude engine: trained = uploaded to Claude and given a file id.
                        <span
                          title={
                            aiStatus === 'FAILED'
                              ? doc.aiError ?? undefined
                              : aiStatus === 'COMPLETED'
                                ? `Claude file id: ${doc.aiFileId ?? ''}${doc.aiTrainedAt ? ` · ${formatDate(doc.aiTrainedAt, settings.general.dateFormat)}` : ''}`
                                : undefined
                          }
                        >
                          <Badge tone={STATUS_TONE[aiStatus]}>
                            {aiStatus === 'COMPLETED'
                              ? `trained · ${(doc.aiFileChars ?? 0).toLocaleString()} chars${doc.aiPages ? ` · ${doc.aiPages} pages` : ''}${doc.aiSectionCount ? ` · ${doc.aiSectionCount} sections` : ''}`
                              : STATUS_LABEL[aiStatus]}
                          </Badge>
                          {aiStatus === 'COMPLETED' && doc.aiFileId && (
                            <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                              {doc.aiFileId}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span title={status === 'FAILED' ? failure : undefined}>
                          <Badge tone={STATUS_TONE[status]}>
                            {status === 'COMPLETED'
                              ? `trained · ${itemCount} items`
                              : STATUS_LABEL[status]}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={e.train}
                        disabled={readOnly || e.remove}
                        onChange={(ev) => patchExisting(doc.id, { train: ev.target.checked })}
                        aria-label={`Train ${doc.fileName}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                      {formatDate(doc.updatedAt ?? doc.createdAt, settings.general.dateFormat)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-3">
                        {companyId != null && (
                          <button
                            type="button"
                            onClick={() => void handleDownload(doc)}
                            className="text-slate-400 hover:text-brand-600"
                            aria-label={`Download ${doc.fileName}`}
                            title="Download"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </button>
                        )}
                        {/* Train again — Claude engine: re-upload to Claude; database engine: re-parse. */}
                        {!readOnly && !e.remove && companyId != null && claudeEngine && (
                          <button
                            type="button"
                            onClick={() => void trainClaude(doc)}
                            disabled={aiStatus === 'PROCESSING'}
                            className="text-slate-400 hover:text-brand-600 disabled:opacity-40"
                            aria-label={`Train ${doc.fileName}${aiStatus === 'COMPLETED' ? ' again' : ''}`}
                            title={aiStatus === 'COMPLETED' ? 'Train again (replaces the file in Claude)' : 'Train'}
                          >
                            <RefreshIcon className="h-4 w-4" />
                          </button>
                        )}
                        {!readOnly && !e.remove && !claudeEngine && e.train && status !== 'NOT_STARTED' && (
                          <button
                            type="button"
                            onClick={() => void retrain(doc)}
                            disabled={status === 'PROCESSING'}
                            className="text-slate-400 hover:text-brand-600 disabled:opacity-40"
                            aria-label={`Train ${doc.fileName} again`}
                            title="Train again"
                          >
                            <RefreshIcon className="h-4 w-4" />
                          </button>
                        )}
                        {!readOnly &&
                          (e.remove ? (
                            <button
                              type="button"
                              onClick={() => patchExisting(doc.id, { remove: false })}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              Undo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => patchExisting(doc.id, { remove: true })}
                              className="text-slate-400 hover:text-red-600"
                              aria-label={`Remove ${doc.fileName}`}
                              title="Remove"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {added.map((a) => (
                <tr key={a.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">
                    <input
                      className="input w-48"
                      value={a.name}
                      onChange={(ev) => patchAdded(a.key, { name: ev.target.value })}
                      placeholder="e.g. Price list 1"
                      maxLength={150}
                      aria-label={`Name of ${a.file.name}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate text-slate-700" title={a.file.name}>
                        {a.file.name}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                    {formatSize(a.file.size)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">—</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge tone="gray">new — uploads on save</Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={a.train}
                      onChange={(ev) => patchAdded(a.key, { train: ev.target.checked })}
                      aria-label={`Train ${a.file.name}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">—</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onAddedChange?.(added.filter((x) => x.key !== a.key))}
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Remove ${a.file.name}`}
                        title="Remove"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <p className="mt-2 text-xs text-slate-400">
            PDF, image, Word or Excel. With the <b>Claude knowledge</b> engine (Settings → API Keys) a
            file saved with <b>Train</b> ticked is trained automatically: its text (with OCR of picture
            pages) is stored in Claude and a catalogue index with sections is built, so quotes attach
            only what a BOQ needs. Only the file id Claude returns is kept here — nothing is parsed
            into the database. Use Train again (↻) after replacing a price list; removing a file (or
            un-ticking Train) removes its copy from Claude. With the <b>database</b> engine, ticked
            files are read into the catalogue when you save.
          </p>
        </>
      )}
    </div>
  );
}
