import { useEffect, useRef, useState } from 'react';
import { listBrandPrompts, trainBrandPromptIntoClaude, trainBrandPromptsIntoClaude } from '../../api/companies';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useAppSelector } from '../../store/hooks';
import type { BrandPrompt, IngestStatus } from '../../types';
import Badge from './Badge';
import { confirmDialog } from './Dialog';
import { ChevronRightIcon, PlusIcon, RefreshIcon, TrashIcon } from '../icons';

/** One keyword-prompt row in the form. `id` is set once the row is saved. */
export interface PromptRow {
  key: string;
  id?: number;
  name: string;
  /** Group label (e.g. "MCCB") — Get Quote ticks/unticks a whole group; "" = ungrouped. */
  group: string;
  content: string;
  train: boolean;
  /** Last saved change — absent on a row that hasn't been saved yet. */
  updatedAt?: string;
  /** Knowledge-in-Claude training state of the SAVED text (Claude engine). */
  aiStatus?: IngestStatus;
  aiFileId?: string | null;
  aiError?: string | null;
  aiTrainedAt?: string | null;
  /** The text as last saved — to show "edited, save then train" while typing. */
  savedContent?: string;
}

export const toPromptRows = (prompts: BrandPrompt[]): PromptRow[] =>
  prompts.map((p) => ({
    key: `saved-${p.id}`,
    id: p.id,
    name: p.name,
    group: p.groupName ?? '',
    content: p.content,
    train: p.train,
    updatedAt: p.updatedAt,
    aiStatus: p.aiStatus,
    aiFileId: p.aiFileId,
    aiError: p.aiError,
    aiTrainedAt: p.aiTrainedAt,
    savedContent: p.content,
  }));

let nextNewKey = 1;

type Tone = 'gray' | 'green' | 'amber' | 'red';
const AI_TONE: Record<IngestStatus, Tone> = {
  COMPLETED: 'green',
  PROCESSING: 'amber',
  FAILED: 'red',
  NOT_STARTED: 'gray',
};
const AI_LABEL: Record<IngestStatus, string> = {
  COMPLETED: 'trained',
  PROCESSING: 'training…',
  FAILED: 'training failed',
  NOT_STARTED: 'not trained',
};

interface Props {
  rows: PromptRow[];
  /** Brand id — needed to train rules into Claude (absent while creating). */
  companyId?: number;
  /** Shown in a toolbar above the list, with the "Add rule" button beside it. */
  title?: string;
  /** View pages pass true: text is shown as-is and the Train boxes are locked. */
  readOnly?: boolean;
  onChange?: (next: PromptRow[]) => void;
}

/**
 * A brand's keyword prompts (rules), one collapsible row each with a name and a
 * "Common" checkbox. On Get Quote every rule is offered in the rule picker; the
 * common ones are ticked by default, the rest start unticked. Rows start collapsed (a
 * long prompt would otherwise fill the page) — only a newly added row opens.
 * Changes are pending until the form is saved.
 *
 * With the Claude knowledge engine each saved rule is also trained into Claude
 * (uploaded as a file with its own id); the row shows that state and a "Train
 * again" button for a rule edited since.
 */
export default function BrandPrompts({ rows, companyId, title, readOnly = false, onChange }: Props) {
  const { settings } = useSettings();
  const claudeEngine = useAppSelector((s) => s.llmStatus.status?.quoteEngine) === 'claude';
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const allOpen = rows.length > 0 && rows.every((r) => open.has(r.key));
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.key)));

  const patch = (key: string, change: Partial<PromptRow>) =>
    onChange?.(rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const addRow = () => {
    const key = `new-${nextNewKey++}`;
    onChange?.([...rows, { key, name: `Rule ${rows.length + 1}`, group: '', content: '', train: true }]);
    setOpen((prev) => new Set(prev).add(key));
  };
  // Group names already used on this brand — offered as suggestions so the same
  // group is spelled the same way on every rule.
  const groupNames = [...new Set(rows.map((r) => r.group.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const groupListId = `rule-groups-${companyId ?? 'new'}`;

  // Refresh the Claude state while any rule is training.
  const training = rows.some((r) => r.aiStatus === 'PROCESSING');
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => {
    if (!training || companyId == null) return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await listBrandPrompts(companyId);
        const byId = new Map(fresh.map((p) => [p.id, p]));
        onChange?.(
          rowsRef.current.map((r) => {
            const p = r.id != null ? byId.get(r.id) : undefined;
            return p
              ? { ...r, aiStatus: p.aiStatus, aiFileId: p.aiFileId, aiError: p.aiError, aiTrainedAt: p.aiTrainedAt }
              : r;
          }),
        );
      } catch {
        /* next tick */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [training, companyId, onChange]);

  const trainOne = async (r: PromptRow) => {
    if (companyId == null || r.id == null) return;
    const label = r.name.trim() || `Rule ${r.id}`;
    const ok = await confirmDialog({
      title: 'Train rule again',
      tone: 'primary',
      confirmLabel: 'Train again',
      message:
        `Train "${label}" into Claude again? The copy in Claude is replaced with the saved text` +
        (r.aiStatus === 'COMPLETED' ? ' and a new file id is issued.' : '.'),
    });
    if (!ok) return;
    setError('');
    try {
      const p = await trainBrandPromptIntoClaude(companyId, r.id);
      patch(r.key, { aiStatus: p.aiStatus, aiFileId: p.aiFileId, aiError: p.aiError, aiTrainedAt: p.aiTrainedAt });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start training'));
    }
  };
  const trainAll = async () => {
    if (companyId == null) return;
    const count = rows.filter((r) => r.id != null).length;
    const ok = await confirmDialog({
      title: 'Train all rules',
      tone: 'primary',
      confirmLabel: 'Train all',
      message: `Train all ${count} saved rule(s) into Claude again? Each copy in Claude is replaced with the saved text.`,
    });
    if (!ok) return;
    setError('');
    try {
      await trainBrandPromptsIntoClaude(companyId);
      onChange?.(rows.map((r) => (r.id != null ? { ...r, aiStatus: 'PROCESSING' as IngestStatus } : r)));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start training'));
    }
  };

  const showTraining = claudeEngine && companyId != null;

  return (
    <div>
      {(title || !readOnly || rows.length > 1) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{title ?? ''}</h3>
          <div className="flex items-center gap-3">
            {rows.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            {showTraining && !readOnly && rows.some((r) => r.id != null) && (
              <button
                type="button"
                onClick={() => void trainAll()}
                disabled={training}
                className="btn-ghost btn-sm"
                title="Upload every saved rule to Claude again"
              >
                <RefreshIcon className="h-4 w-4" />
                Train all
              </button>
            )}
            {!readOnly && (
              <button type="button" onClick={addRow} className="btn-primary btn-sm">
                <PlusIcon className="h-4 w-4" />
                Add rule
              </button>
            )}
          </div>
        </div>
      )}
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">No rules added yet.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const isOpen = open.has(r.key);
              const label = r.name.trim() || `Rule ${i + 1}`;
              const aiStatus: IngestStatus = r.aiStatus ?? 'NOT_STARTED';
              const edited = r.savedContent !== undefined && r.savedContent !== r.content;
              return (
                <li key={r.key} className="rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggle(r.key)}
                      className="shrink-0 text-slate-400 hover:text-brand-600"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label}`}
                      title={isOpen ? 'Collapse' : 'Expand'}
                    >
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {readOnly ? (
                      <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-800">
                        {r.group.trim() && <Badge tone="violet">{r.group.trim()}</Badge>}
                        {label}
                      </span>
                    ) : (
                      <>
                        {/* Group (e.g. MCCB): Get Quote ticks/unticks every rule of a group at once. */}
                        <input
                          className="input w-32 shrink-0"
                          value={r.group}
                          list={groupListId}
                          onChange={(e) => patch(r.key, { group: e.target.value })}
                          placeholder="Group"
                          maxLength={100}
                          aria-label={`Group of rule ${i + 1}`}
                          title="Group this rule belongs to, e.g. MCCB. On Get Quote a whole group can be ticked or unticked at once."
                        />
                        <input
                          className="input w-56 shrink-0"
                          value={r.name}
                          onChange={(e) => patch(r.key, { name: e.target.value })}
                          placeholder={`Rule ${i + 1}`}
                          maxLength={150}
                          aria-label={`Name of rule ${i + 1}`}
                        />
                      </>
                    )}

                    {/* One-line preview while collapsed; click it to open the row. */}
                    <button
                      type="button"
                      onClick={() => toggle(r.key)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-slate-400"
                      tabIndex={-1}
                    >
                      {isOpen ? '' : r.content.trim() || 'Empty — expand to write the rule'}
                    </button>

                    {/* Claude engine: is the SAVED text trained into Claude? */}
                    {showTraining && (
                      <span
                        className="shrink-0"
                        title={
                          r.id == null
                            ? 'Saves first, then trains'
                            : aiStatus === 'FAILED'
                              ? r.aiError ?? undefined
                              : aiStatus === 'COMPLETED'
                                ? `Claude file id: ${r.aiFileId ?? ''}${r.aiTrainedAt ? ` · ${formatDate(r.aiTrainedAt, settings.general.dateFormat)}` : ''}`
                                : undefined
                        }
                      >
                        <Badge tone={r.id == null ? 'gray' : edited ? 'amber' : AI_TONE[aiStatus]}>
                          {r.id == null
                            ? 'new — save, then Train'
                            : edited
                              ? 'edited — save, then Train again'
                              : AI_LABEL[aiStatus]}
                        </Badge>
                      </span>
                    )}

                    {/* "Common" = pre-ticked in the Get Quote rule picker (stored as `train`). */}
                    <label
                      className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600"
                      title="Common rules are ticked by default when a quote is started for this brand; the user can still tick or untick them per chat."
                    >
                      <input
                        type="checkbox"
                        checked={r.train}
                        disabled={readOnly}
                        onChange={(e) => patch(r.key, { train: e.target.checked })}
                      />
                      Common
                    </label>
                    <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
                      {r.updatedAt ? formatDate(r.updatedAt, settings.general.dateFormat) : '—'}
                    </span>
                    {showTraining && !readOnly && r.id != null && (
                      <button
                        type="button"
                        onClick={() => void trainOne(r)}
                        disabled={aiStatus === 'PROCESSING' || edited}
                        className="shrink-0 text-slate-400 hover:text-brand-600 disabled:opacity-40"
                        aria-label={`Train ${label} again`}
                        title={edited ? 'Save the change first' : 'Train again (upload this rule to Claude)'}
                      >
                        <RefreshIcon className="h-4 w-4" />
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onChange?.(rows.filter((x) => x.key !== r.key))}
                        className="shrink-0 text-slate-400 hover:text-red-600"
                        aria-label={`Remove ${label}`}
                        title="Remove"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-3 py-3">
                      {readOnly ? (
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{r.content}</p>
                      ) : (
                        <textarea
                          className="input min-h-32 resize-y"
                          rows={6}
                          value={r.content}
                          onChange={(e) => patch(r.key, { content: e.target.value })}
                          placeholder="e.g. Replace every DN-series MCCB with the equivalent DZ double-break breaker at the same rating…"
                          aria-label={`Text of ${label}`}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {!readOnly && groupNames.length > 0 && (
            <datalist id={groupListId}>
              {groupNames.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          )}
        </>
      )}

      {!readOnly && (
        <>
          <p className="mt-2 text-xs text-slate-400">
            Rules about this brand’s products — series names, trade shorthand, what to prefer, what to
            replace. Give each one a name and, optionally, a <strong>Group</strong> (e.g. MCCB, ACB,
            Accessories): on Get Quote the rules are listed under their group and a whole group can be
            ticked or unticked at once. Every rule of the brand is offered; the ones ticked
            <strong> Common</strong> are selected by default, the others start unticked. The user
            can tick or untick any rule or group per chat.
            {showTraining && (
              <>
                {' '}
                With the Claude engine each rule is trained into Claude as its own file when you click
                Train (↻) — save first, then train; an edited rule needs Train again. Removing a rule
                removes its copy from Claude. The quote sends trained rules by their Claude file ids.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
