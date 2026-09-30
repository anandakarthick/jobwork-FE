import { useRef, useState } from 'react';
import { downloadBrandPriceList, downloadBrandPriceListText } from '../../api/companies';
import { ingestPriceListDocument } from '../../api/priceList';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { pollIngestJobs, registerIngest, pushToast } from '../../store/ingestJobsSlice';
import type { IngestStatus, ProductDocument } from '../../types';
import Badge from './Badge';
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
  readOnly = false,
  onExistingChange,
  onAddedChange,
}: Props) {
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const jobsById = useAppSelector((s) => s.ingestJobs.byId);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patchExisting = (docId: number, patch: Partial<ExistingFile>) =>
    onExistingChange?.(existing.map((e) => (e.doc.id === docId ? { ...e, ...patch } : e)));
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
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {empty ? (
        <p className="py-2 text-sm text-slate-400">No reference files added.</p>
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
                        {!readOnly && !e.remove && e.train && status !== 'NOT_STARTED' && (
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost btn-sm mt-3"
          >
            <PlusIcon className="h-4 w-4" />
            Add file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <p className="mt-2 text-xs text-slate-400">
            PDF, image, Word or Excel. When you save, every file is read into text and stored with
            the brand; a scan or an image has no text of its own, so it is read by the AI (this
            uses API credit). Tick Train to also have the file read into the catalogue that Get
            Quote matches against. Both run in the background after you save.
          </p>
        </>
      )}
    </div>
  );
}
