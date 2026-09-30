import { useEffect, useState } from 'react';
import {
  createQuotePrompt,
  deleteQuotePrompt,
  listQuotePrompts,
  updateQuotePrompt,
  type QuotePrompt,
} from '../../api/settings';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PlusIcon, SlidersIcon, TrashIcon } from '../../components/icons';

interface Draft {
  id: number | null;
  name: string;
  content: string;
  enabled: boolean;
}
const EMPTY: Draft = { id: null, name: '', content: '', enabled: true };

/**
 * Settings → Configure Prompt. Users save extra instruction snippets that are
 * appended to the built-in quote-extraction prompt; every ENABLED snippet is
 * sent alongside the input file when a quote is generated.
 */
export default function PromptSection() {
  const { can } = useAuth();
  const canEdit = can('settings.edit');

  const [prompts, setPrompts] = useState<QuotePrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listQuotePrompts()
      .then(setPrompts)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load prompts')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startNew = () => setDraft({ ...EMPTY });
  const startEdit = (p: QuotePrompt) =>
    setDraft({ id: p.id, name: p.name, content: p.content, enabled: p.enabled });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.content.trim()) {
      setError('Give the prompt a name and some content.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (draft.id == null) {
        await createQuotePrompt({ name: draft.name.trim(), content: draft.content.trim(), enabled: draft.enabled });
      } else {
        await updateQuotePrompt(draft.id, { name: draft.name.trim(), content: draft.content.trim(), enabled: draft.enabled });
      }
      setDraft(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the prompt'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: QuotePrompt) => {
    try {
      await updateQuotePrompt(p.id, { enabled: !p.enabled });
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update the prompt'));
    }
  };

  const remove = async (p: QuotePrompt) => {
    if (!window.confirm(`Delete prompt "${p.name}"?`)) return;
    try {
      await deleteQuotePrompt(p.id);
      if (draft?.id === p.id) setDraft(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the prompt'));
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <SlidersIcon className="h-5 w-5 text-brand-500" />
              Configure Prompt
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Add your own instructions to the AI. Every <strong>enabled</strong> prompt below is
              appended to the built-in extraction prompt and sent with the input file each time a
              quote is generated — so you can steer how the BOQ is read, without code changes.
            </p>
          </div>
          {canEdit && !draft && (
            <button type="button" className="btn-primary shrink-0" onClick={startNew}>
              <PlusIcon className="h-4 w-4" />
              New prompt
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Editor */}
        {draft && (
          <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Prompt name
              </label>
              <input
                className="input"
                placeholder="e.g. Panel accessory rules"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Instructions
              </label>
              <textarea
                className="input min-h-[9rem] font-mono text-xs leading-relaxed"
                placeholder="Write extra instructions for the AI — e.g. 'Every MCCB must include a spreader link and extended rotary handle.'"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              />
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Enabled — include this prompt when generating quotes
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : draft.id == null ? 'Save prompt' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : prompts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No prompts yet. {canEdit && 'Click “New prompt” to add one.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {prompts.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{p.name}</span>
                  <Badge tone={p.enabled ? 'green' : 'gray'}>{p.enabled ? 'enabled' : 'disabled'}</Badge>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        onClick={() => void toggle(p)}
                      >
                        {p.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        onClick={() => startEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => void remove(p)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">{p.content}</p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
