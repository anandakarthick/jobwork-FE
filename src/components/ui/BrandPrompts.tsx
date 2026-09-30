import { useState } from 'react';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import type { BrandPrompt } from '../../types';
import { ChevronRightIcon, PlusIcon, TrashIcon } from '../icons';

/** One keyword-prompt row in the form. `id` is set once the row is saved. */
export interface PromptRow {
  key: string;
  id?: number;
  name: string;
  content: string;
  train: boolean;
  /** Last saved change — absent on a row that hasn't been saved yet. */
  updatedAt?: string;
}

export const toPromptRows = (prompts: BrandPrompt[]): PromptRow[] =>
  prompts.map((p) => ({
    key: `saved-${p.id}`,
    id: p.id,
    name: p.name,
    content: p.content,
    train: p.train,
    updatedAt: p.updatedAt,
  }));

let nextNewKey = 1;

interface Props {
  rows: PromptRow[];
  /** View pages pass true: text is shown as-is and the Train boxes are locked. */
  readOnly?: boolean;
  onChange?: (next: PromptRow[]) => void;
}

/**
 * A brand's keyword prompts, one collapsible row each with a name and a "Train"
 * checkbox. A trained prompt is sent to the AI whenever a quote is generated for
 * this brand; an untrained one is only kept as a note. Rows start collapsed (a
 * long prompt would otherwise fill the page) — only a newly added row opens.
 * Changes are pending until the form is saved.
 */
export default function BrandPrompts({ rows, readOnly = false, onChange }: Props) {
  const { settings } = useSettings();
  const [open, setOpen] = useState<Set<string>>(new Set());

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
    onChange?.([...rows, { key, name: `Rule ${rows.length + 1}`, content: '', train: true }]);
    setOpen((prev) => new Set(prev).add(key));
  };

  return (
    <div>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">No keyword prompts added.</p>
      ) : (
        <>
          {rows.length > 1 && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const isOpen = open.has(r.key);
              const label = r.name.trim() || `Prompt ${i + 1}`;
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
                      <span className="shrink-0 text-sm font-medium text-slate-800">{label}</span>
                    ) : (
                      <input
                        className="input w-56 shrink-0"
                        value={r.name}
                        onChange={(e) => patch(r.key, { name: e.target.value })}
                        placeholder={`Rule ${i + 1}`}
                        maxLength={150}
                        aria-label={`Name of keyword prompt ${i + 1}`}
                      />
                    )}

                    {/* One-line preview while collapsed; click it to open the row. */}
                    <button
                      type="button"
                      onClick={() => toggle(r.key)}
                      className="min-w-0 flex-1 truncate text-left text-sm text-slate-400"
                      tabIndex={-1}
                    >
                      {isOpen ? '' : r.content.trim() || 'Empty — expand to write the prompt'}
                    </button>

                    <label className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={r.train}
                        disabled={readOnly}
                        onChange={(e) => patch(r.key, { train: e.target.checked })}
                      />
                      Train
                    </label>
                    <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
                      {r.updatedAt ? formatDate(r.updatedAt, settings.general.dateFormat) : '—'}
                    </span>
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
                          placeholder="e.g. DN series = dsine MCCB with adjustable thermal-magnetic release; “double break” means the DZ series…"
                          aria-label={`Text of ${label}`}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!readOnly && (
        <>
          <button type="button" onClick={addRow} className="btn-ghost btn-sm mt-3">
            <PlusIcon className="h-4 w-4" />
            Add prompt
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Notes about this brand’s products — series names, trade shorthand, what to prefer. Give
            each one a name, and tick Train to send it to the AI whenever a quote is generated for
            this brand; leave it unticked to keep it only as a note.
          </p>
        </>
      )}
    </div>
  );
}
