import { useEffect, useRef, useState } from 'react';
import { listBrandPrompts, trainBrandPromptIntoClaude, trainBrandPromptsIntoClaude } from '../../api/companies';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useAppSelector } from '../../store/hooks';
import type { BrandPrompt, BrandRuleGroup, IngestStatus } from '../../types';
import Badge from './Badge';
import { confirmDialog } from './Dialog';
import { ChevronRightIcon, PlusIcon, RefreshIcon, TrashIcon } from '../icons';

/** One rule group in the form. `id` is set once the group is saved. */
export interface GroupRow {
  key: string;
  id?: number;
  name: string;
}

/** One keyword-prompt row in the form. `id` is set once the row is saved. */
export interface PromptRow {
  key: string;
  id?: number;
  name: string;
  /** Key of the GroupRow the rule lives in; null = an older rule created before groups. */
  groupKey: string | null;
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

export const groupKeyFor = (groupId: number) => `saved-g-${groupId}`;

export const toGroupRows = (groups: BrandRuleGroup[]): GroupRow[] =>
  groups.map((g) => ({ key: groupKeyFor(g.id), id: g.id, name: g.name }));

export const toPromptRows = (prompts: BrandPrompt[]): PromptRow[] =>
  prompts.map((p) => ({
    key: `saved-${p.id}`,
    id: p.id,
    name: p.name,
    groupKey: p.groupId != null ? groupKeyFor(p.groupId) : null,
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
  groups: GroupRow[];
  rows: PromptRow[];
  /** Brand id — needed to train rules into Claude (absent while creating). */
  companyId?: number;
  /** Shown in a toolbar above the list, with the "Add group" button beside it. */
  title?: string;
  /** View pages pass true: text is shown as-is and the Train boxes are locked. */
  readOnly?: boolean;
  onGroupsChange?: (next: GroupRow[]) => void;
  onChange?: (next: PromptRow[]) => void;
}

/**
 * A brand's rules as a tree: first a GROUP is created (e.g. "MCCB"), then rules
 * are added inside it. Get Quote shows the same tree and can tick a whole group
 * at once. Each rule row has a name, a "Common" checkbox and collapsible text.
 * Rows start collapsed (a long prompt would otherwise fill the page) — only a
 * newly added row opens. Changes are pending until the form is saved.
 *
 * With the Claude knowledge engine each saved rule is also trained into Claude
 * (uploaded as a file with its own id); the row shows that state and a "Train
 * again" button for a rule edited since.
 */
export default function BrandPrompts({
  groups,
  rows,
  companyId,
  title,
  readOnly = false,
  onGroupsChange,
  onChange,
}: Props) {
  const { settings } = useSettings();
  const claudeEngine = useAppSelector((s) => s.llmStatus.status?.quoteEngine) === 'claude';
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const allOpen = rows.length > 0 && rows.every((r) => open.has(r.key));
  const toggleAll = () => {
    setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.key)));
    if (!allOpen) setCollapsedGroups(new Set());
  };

  const patch = (key: string, change: Partial<PromptRow>) =>
    onChange?.(rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const patchGroup = (key: string, change: Partial<GroupRow>) =>
    onGroupsChange?.(groups.map((g) => (g.key === key ? { ...g, ...change } : g)));

  const addGroup = () => {
    const key = `new-g-${nextNewKey++}`;
    onGroupsChange?.([...groups, { key, name: '' }]);
    // Focus the new group's name box once it renders.
    window.setTimeout(() => document.getElementById(`group-name-${key}`)?.focus(), 0);
  };
  const addRow = (groupKey: string | null) => {
    const key = `new-${nextNewKey++}`;
    const inGroup = rows.filter((r) => r.groupKey === groupKey).length;
    onChange?.([...rows, { key, name: `Rule ${inGroup + 1}`, groupKey, content: '', train: true }]);
    setOpen((prev) => new Set(prev).add(key));
    setCollapsedGroups((prev) => {
      if (groupKey == null || !prev.has(groupKey)) return prev;
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  };
  const removeGroup = async (g: GroupRow) => {
    const inGroup = rows.filter((r) => r.groupKey === g.key);
    const label = g.name.trim() || 'this group';
    if (inGroup.length > 0) {
      const ok = await confirmDialog({
        title: 'Remove group',
        tone: 'danger',
        confirmLabel: 'Remove group and rules',
        message: `Remove "${label}" and the ${inGroup.length} rule(s) in it? They are deleted when you save the brand.`,
      });
      if (!ok) return;
      onChange?.(rows.filter((r) => r.groupKey !== g.key));
    }
    onGroupsChange?.(groups.filter((x) => x.key !== g.key));
  };

  // Refresh the Claude state while any rule is training.
  const training = rows.some((r) => r.aiStatus === 'PROCESSING');
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => {
    if (!training || companyId == null) return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await listBrandPrompts(companyId);
        const byId = new Map(fresh.prompts.map((p) => [p.id, p]));
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
  const groupKeys = new Set(groups.map((g) => g.key));
  // Older rules saved before groups existed (or whose group row was removed).
  const ungrouped = rows.filter((r) => r.groupKey == null || !groupKeys.has(r.groupKey));
  const dupNames = new Set(
    groups
      .map((g) => g.name.trim().toLowerCase())
      .filter((n, i, arr) => n && arr.indexOf(n) !== i),
  );

  const renderRule = (r: PromptRow, i: number) => {
    const isOpen = open.has(r.key);
    const label = r.name.trim() || `Rule ${i + 1}`;
    const aiStatus: IngestStatus = r.aiStatus ?? 'NOT_STARTED';
    const edited = r.savedContent !== undefined && r.savedContent !== r.content;
    return (
      <li key={r.key} className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={() => toggle(r.key)}
            className="shrink-0 text-slate-400 hover:text-brand-600"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label}`}
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>

          {readOnly ? (
            <span className="shrink-0 text-sm font-medium text-slate-800">{label}</span>
          ) : (
            <input
              className="input w-56 shrink-0"
              value={r.name}
              onChange={(e) => patch(r.key, { name: e.target.value })}
              placeholder={`Rule ${i + 1}`}
              maxLength={150}
              aria-label={`Name of rule ${i + 1}`}
            />
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
                {r.id == null ? 'new — save, then Train' : edited ? 'edited — save, then Train again' : AI_LABEL[aiStatus]}
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
              title="Remove rule"
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
  };

  /** A group card: header (chevron, name, count, Add rule, remove) and its rules nested below. */
  const renderGroup = (g: GroupRow | null, list: PromptRow[], index: number) => {
    const key = g?.key ?? '__ungrouped';
    const collapsed = collapsedGroups.has(key);
    const label = g ? g.name.trim() || `Group ${index + 1}` : 'No group';
    const dup = g != null && dupNames.has(g.name.trim().toLowerCase());
    return (
      <li key={key} className="rounded-xl border border-violet-200 bg-violet-50/40">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={() => toggleGroup(key)}
            className="shrink-0 text-violet-400 hover:text-violet-700"
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
          </button>
          <Badge tone="violet">Group</Badge>
          {g && !readOnly ? (
            <input
              id={`group-name-${g.key}`}
              className={`input w-64 shrink-0 font-medium ${dup ? 'border-red-400' : ''}`}
              value={g.name}
              onChange={(e) => patchGroup(g.key, { name: e.target.value })}
              placeholder="Group name, e.g. MCCB"
              maxLength={100}
              aria-label={`Name of group ${index + 1}`}
              title={dup ? 'Another group has this name' : undefined}
            />
          ) : (
            <span className="shrink-0 text-sm font-semibold text-slate-800">{label}</span>
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
            {list.length === 0 ? 'No rules yet' : `${list.length} rule${list.length === 1 ? '' : 's'}`}
            {g == null && ' — created before groups; add them to a group or leave as is'}
          </span>
          {!readOnly && g && (
            <button type="button" onClick={() => addRow(g.key)} className="btn-ghost btn-sm">
              <PlusIcon className="h-4 w-4" />
              Add rule
            </button>
          )}
          {!readOnly && g && (
            <button
              type="button"
              onClick={() => void removeGroup(g)}
              className="shrink-0 text-slate-400 hover:text-red-600"
              aria-label={`Remove ${label}`}
              title="Remove group"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="border-t border-violet-100 px-3 py-2 pl-8">
            {list.length === 0 ? (
              <p className="py-1 text-sm text-slate-400">
                {readOnly ? 'No rules in this group.' : 'Click “Add rule” to write the first rule of this group.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((r, i) => (
                  <li key={r.key} className="flex items-stretch gap-2">
                    {!readOnly && g != null && groups.length > 1 && (
                      /* Move a rule to another group. */
                      <select
                        className="input w-10 shrink-0 self-start px-1 text-xs"
                        value={g.key}
                        onChange={(e) => patch(r.key, { groupKey: e.target.value })}
                        aria-label="Move rule to group"
                        title="Move this rule to another group"
                      >
                        {groups.map((x, gi) => (
                          <option key={x.key} value={x.key}>
                            {x.name.trim() || `Group ${gi + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    {!readOnly && g == null && groups.length > 0 && (
                      <select
                        className="input w-28 shrink-0 self-start text-xs"
                        value=""
                        onChange={(e) => e.target.value && patch(r.key, { groupKey: e.target.value })}
                        aria-label="Add rule to group"
                        title="Move this rule into a group"
                      >
                        <option value="">Move to…</option>
                        {groups.map((x, gi) => (
                          <option key={x.key} value={x.key}>
                            {x.name.trim() || `Group ${gi + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    <ul className="min-w-0 flex-1">{renderRule(r, i)}</ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      {(title || !readOnly || rows.length > 1) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{title ?? ''}</h3>
          <div className="flex items-center gap-3">
            {rows.length > 1 && (
              <button type="button" onClick={toggleAll} className="text-xs font-medium text-brand-600 hover:text-brand-700">
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
              <button type="button" onClick={addGroup} className="btn-primary btn-sm">
                <PlusIcon className="h-4 w-4" />
                Add group
              </button>
            )}
          </div>
        </div>
      )}
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {groups.length === 0 && rows.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">
          {readOnly ? 'No rules added yet.' : 'No groups yet — add a group (e.g. MCCB), then add rules inside it.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g, i) =>
            renderGroup(
              g,
              rows.filter((r) => r.groupKey === g.key),
              i,
            ),
          )}
          {ungrouped.length > 0 && renderGroup(null, ungrouped, groups.length)}
        </ul>
      )}

      {!readOnly && (
        <p className="mt-2 text-xs text-slate-400">
          Rules about this brand’s products — series names, trade shorthand, what to prefer, what to
          replace. First add a <strong>group</strong> (e.g. MCCB, ACB, Accessories), then add rules inside
          it; a group may hold any number of rules. On Get Quote the same tree is shown — a whole group can
          be ticked or unticked at once, and rules can still be picked one by one. The rules ticked
          <strong> Common</strong> are selected by default, the others start unticked.
          {showTraining && (
            <>
              {' '}
              With the Claude engine each rule is trained into Claude as its own file when you click
              Train (↻) — save first, then train; an edited rule needs Train again. Removing a rule
              removes its copy from Claude. The quote sends trained rules by their Claude file ids.
            </>
          )}
        </p>
      )}
    </div>
  );
}
