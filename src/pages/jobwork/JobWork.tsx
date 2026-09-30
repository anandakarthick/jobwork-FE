import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { listCustomers } from '../../api/customers';
import { listCompanies } from '../../api/companies';
import {
  createQuote,
  deleteQuote,
  downloadQuote,
  getQuote,
  listQuotes,
  renameQuote,
  sendQuoteMessage,
  type Quote,
  type QuoteListItem,
  type QuoteMessage,
} from '../../api/quotes';
import { apiErrorMessage } from '../../lib/api';
import { pickChatPhases, pickGenPhases } from '../../lib/thinkingPhrases';
import { useAppDispatch } from '../../store/hooks';
import { fetchLlmStatus } from '../../store/llmStatusSlice';
import { useAuth } from '../../context/AuthContext';
import type { Customer } from '../../types';
import Badge from '../../components/ui/Badge';
import Thinking from '../../components/ui/Thinking';
import SendEmailModal from './SendEmailModal';
import {
  ChevronRightIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  MailIcon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  TrashIcon,
} from '../../components/icons';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


/** Keep the thinking indicator on screen at least this long so it doesn't flash. */
const MIN_THINK_MS = 1800;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
function money(v: string | null): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? inr.format(n) : '—';
}

/** Mirror of the backend filename: Customer-Product-DD.MM.YYYY.xlsx (quote's date). */
function quoteFileName(q: Quote): string {
  // A name set from the chat ("rename the file to …") wins over the derived one.
  if (q.downloadName?.trim()) return `${q.downloadName.trim()}.xlsx`;
  const clean = (s: string) =>
    s.trim().replace(/[^\w\s-]+/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') ||
    'NA';
  const d = new Date(q.createdAt);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${clean(q.customer.name)}-${clean(q.category?.name ?? 'product')}-${dd}.${mm}.${d.getFullYear()}.xlsx`;
}

/** Total items across the feeder-grouped BOM (null when the quote isn't a BOM). */
function bomItemCount(q: Quote): number | null {
  if (!q.bomJson?.length) return null;
  return q.bomJson.reduce(
    (n, b) => n + (b.feeders?.reduce((m, f) => m + (f.items?.length ?? 0), 0) ?? 0),
    0,
  );
}

const chatTitle = (q: { id: number; title: string | null }) => q.title?.trim() || `Quote #${q.id}`;

function chatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString();
}

/**
 * Get Quote — a ChatGPT-style workspace. Left: every chat (one per quote), with
 * auto names you can change. Right: the conversation. A new chat starts by
 * choosing the customer and brand(s), attaching the BOQ and sending; the quote
 * is generated from the brands' trained price lists, their keyword prompts and
 * their reference files, comes back as a downloadable Excel, and the chat then
 * continues on it (questions, changes, a new BOQ).
 */
export default function JobWork() {
  const dispatch = useAppDispatch();
  const { can } = useAuth();
  const canSendEmail = can('email.send');

  // Master data for a new chat.
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [brands, setBrands] = useState<string[]>([]);

  // Chat list + the open chat.
  const [chats, setChats] = useState<QuoteListItem[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [opening, setOpening] = useState(false);
  const [listOpen, setListOpen] = useState(false); // small screens only

  // Composer.
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  // Fresh random wording for the progress indicators every time work starts.
  const genPhases = useMemo(() => pickGenPhases(), [generating]); // eslint-disable-line react-hooks/exhaustive-deps
  const chatPhases = useMemo(() => pickChatPhases(), [chatBusy]); // eslint-disable-line react-hooks/exhaustive-deps
  const [error, setError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [linesOpen, setLinesOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadChats = useCallback(async () => {
    try {
      const res = await listQuotes({ page: 1, limit: 100 });
      setChats(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load chats'));
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChats();
    // Only ACTIVE customers and brands can be quoted for.
    listCustomers({ page: 1, limit: 100, status: 'ACTIVE' })
      .then((res) => setCustomers(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load customers')));
    listCompanies({ page: 1, limit: 100, status: 'ACTIVE' })
      .then((res) =>
        setAllBrands(
          [...new Set(res.data.map((c) => c.name.trim()).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b),
          ),
        ),
      )
      .catch(() => {});
  }, [loadChats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatBusy, generating]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const newChat = () => {
    setQuote(null);
    setMessages([]);
    setFiles([]);
    setInput('');
    setError('');
    setLinesOpen(false);
    setListOpen(false);
  };

  const openChat = async (id: number) => {
    if (quote?.id === id) {
      setListOpen(false);
      return;
    }
    setOpening(true);
    setError('');
    try {
      const q = await getQuote(id);
      setQuote(q);
      setMessages(q.messages ?? []);
      setCustomerId(q.customer.id);
      setBrands(q.brand ? q.brand.split(',').map((b) => b.trim()).filter(Boolean) : []);
      setFiles([]);
      setInput('');
      setLinesOpen(false);
      setListOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not open the chat'));
    } finally {
      setOpening(false);
    }
  };

  const rename = async (id: number, title: string) => {
    const t = title.trim();
    if (!t) return;
    try {
      const updated = await renameQuote(id, t);
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)));
      if (quote?.id === id) setQuote((q) => (q ? { ...q, title: updated.title } : q));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not rename the chat'));
    }
  };

  const remove = async (c: QuoteListItem) => {
    if (!window.confirm(`Delete the chat "${chatTitle(c)}"? This removes the quote too.`)) return;
    try {
      await deleteQuote(c.id);
      setChats((prev) => prev.filter((x) => x.id !== c.id));
      if (quote?.id === c.id) newChat();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the chat'));
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  /** First message of a new chat: customer + brands + BOQ → generate the quote. */
  const startChat = async (text: string) => {
    if (!selectedCustomer) return setError('Choose a customer first.');
    if (brands.length === 0) return setError('Select at least one brand.');
    if (files.length === 0) return setError('Attach your BOQ file to start the quote.');
    setError('');
    const sent = files;
    setFiles([]);
    setInput('');
    setMessages([
      {
        id: -Date.now(),
        role: 'USER',
        content: text || `Please prepare a quote from ${sent.map((f) => f.name).join(', ')}.`,
        attachments: sent.map((f) => ({ name: f.name, path: '', mimeType: f.type })),
        createdAt: new Date().toISOString(),
      },
    ]);
    setGenerating(true);
    const started = Date.now();
    try {
      const result = await createQuote({
        customerId: selectedCustomer.id,
        brand: brands.join(','),
        message: text,
        files: sent,
      });
      setQuote(result);
      setMessages(result.messages ?? []);
      void dispatch(fetchLlmStatus()); // generation spent tokens — refresh the balance
      void loadChats();
      if (result.status === 'FAILED') setError(result.error || 'Quote generation failed.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not generate the quote'));
      setFiles(sent); // let the user retry without re-attaching
    } finally {
      const remaining = MIN_THINK_MS - (Date.now() - started);
      if (remaining > 0) await sleep(remaining);
      setGenerating(false);
    }
  };

  /** Any later message: ask, change, or attach a new BOQ to regenerate. */
  const continueChat = async (text: string) => {
    if (!quote) return;
    const sent = files;
    setInput('');
    setFiles([]);
    setMessages((prev) => [
      ...prev,
      {
        id: -Date.now(),
        role: 'USER',
        content: text || (sent.length ? `📎 ${sent.map((f) => f.name).join(', ')}` : ''),
        attachments: sent.length ? sent.map((f) => ({ name: f.name, path: '', mimeType: f.type })) : null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setChatBusy(true);
    const started = Date.now();
    try {
      const reply = await sendQuoteMessage(quote.id, text, sent);
      setMessages((prev) => [...prev, reply]);
      // The chat may have edited the quote — pull the fresh lines/BOM for the file card.
      if (reply.quoteChanged) {
        try {
          setQuote(await getQuote(quote.id));
        } catch {
          /* keep the reply even if the refetch fails */
        }
      }
      void dispatch(fetchLlmStatus());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send message'));
    } finally {
      const remaining = MIN_THINK_MS - (Date.now() - started);
      if (remaining > 0) await sleep(remaining);
      setChatBusy(false);
    }
  };

  const send = () => {
    const text = input.trim();
    if (generating || chatBusy) return;
    if (quote) {
      if (!text && files.length === 0) return;
      void continueChat(text);
    } else {
      void startChat(text);
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const busy = generating || chatBusy;
  const canSend = quote ? input.trim().length > 0 || files.length > 0 : true;

  return (
    <div className="relative flex h-[calc(100vh-7rem)] min-h-[34rem] gap-4">
      {/* ── Left: chat history ─────────────────────────────────────────── */}
      <ChatList
        chats={chats}
        loading={chatsLoading}
        activeId={quote?.id ?? null}
        open={listOpen}
        onNew={newChat}
        onOpen={(id) => void openChat(id)}
        onRename={rename}
        onDelete={(c) => void remove(c)}
      />

      {/* ── Right: the conversation ────────────────────────────────────── */}
      <div className="card flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            className="btn-ghost btn-sm lg:hidden"
            onClick={() => setListOpen((o) => !o)}
          >
            Chats
          </button>
          <div className="min-w-0 flex-1">
            {quote ? (
              <TitleEditor title={chatTitle(quote)} onSave={(t) => void rename(quote.id, t)} />
            ) : (
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SparklesIcon className="h-4 w-4 text-brand-500" />
                New quote
              </h2>
            )}
            {quote && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span>{quote.customer.name}</span>
                {brands.map((b) => (
                  <Badge key={b} tone="blue">{b}</Badge>
                ))}
                <Badge tone={quote.status === 'COMPLETED' ? 'green' : quote.status === 'FAILED' ? 'red' : 'amber'}>
                  {quote.status}
                </Badge>
                {quote.provider && <span className="text-slate-400">via {quote.provider}</span>}
              </div>
            )}
          </div>
          {quote?.status === 'COMPLETED' && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" className="btn-ghost btn-sm" onClick={() => void downloadQuote(quote.id)}>
                <DownloadIcon className="h-4 w-4" />
                Download
              </button>
              {canSendEmail && (
                <button type="button" className="btn-primary btn-sm" onClick={() => setEmailOpen(true)}>
                  <MailIcon className="h-4 w-4" />
                  Email
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {opening && <p className="py-10 text-center text-sm text-slate-400">Opening chat…</p>}

          {!opening && !quote && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50">
                <SparklesIcon className="h-6 w-6 text-brand-500" />
              </span>
              <p className="text-sm font-medium text-slate-700">Start a new quote</p>
              <p className="max-w-sm text-sm text-slate-400">
                Choose the customer and brand(s) below, attach the BOQ, add any instructions and
                send. The quote is built from each brand’s trained price lists, keyword prompts and
                reference files, and you can keep chatting to refine it.
              </p>
            </div>
          )}

          {!opening &&
            (() => {
              const visible = messages.filter((m) => m.role !== 'SYSTEM');
              const firstAssistant = visible.findIndex((m) => m.role === 'ASSISTANT');
              let lastAssistant = -1;
              for (let i = visible.length - 1; i >= 0; i--) {
                if (visible[i].role === 'ASSISTANT') {
                  lastAssistant = i;
                  break;
                }
              }
              return visible.map((m, idx) => {
                // The Excel card sits under the draft (first) reply and under the
                // latest reply, so the current file is always within reach.
                const showFile =
                  quote?.status === 'COMPLETED' &&
                  m.role === 'ASSISTANT' &&
                  (idx === firstAssistant || idx === lastAssistant || m.quoteChanged);
                return (
                  <Fragment key={m.id}>
                    <Bubble message={m} />
                    {showFile && quote && (
                      <QuoteFileCard
                        quote={quote}
                        showLines={idx === firstAssistant}
                        linesOpen={linesOpen}
                        onToggleLines={() => setLinesOpen((o) => !o)}
                        onEmail={canSendEmail ? () => setEmailOpen(true) : undefined}
                      />
                    )}
                  </Fragment>
                );
              });
            })()}

          {generating && <Thinking variant="block" phases={genPhases} interval={2800} />}
          {chatBusy && <Thinking variant="bubble" phases={chatPhases} />}
          <div ref={chatEndRef} />
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="border-t border-slate-100 p-3">
          {!quote && (
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              <select
                className="input"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                aria-label="Customer"
                disabled={busy}
              >
                <option value="">— Choose a customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <BrandSelect all={allBrands} value={brands} onChange={setBrands} disabled={busy} />
            </div>
          )}

          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={`${f.name}:${f.size}`}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                >
                  <PaperclipIcon className="h-3.5 w-3.5" />
                  <span className="max-w-[14rem] truncate">{f.name}</span>
                  <span className="text-slate-400">{formatSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`Remove ${f.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600"
              aria-label="Attach files"
              title={quote ? 'Attach a file (a new BOQ regenerates the quote)' : 'Attach the BOQ / spec files'}
              disabled={busy}
            >
              <PaperclipIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <textarea
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
              rows={1}
              placeholder={
                quote
                  ? 'Ask about this quote, or request a change…'
                  : 'Attach the BOQ, add any instructions, and press Enter to generate the quote…'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !canSend}
              className="btn-primary grid h-9 w-9 place-items-center !px-0"
              aria-label={quote ? 'Send' : 'Generate the quote'}
            >
              {quote ? <SendIcon className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>

      {emailOpen && quote && (
        <SendEmailModal quote={quote} onClose={() => setEmailOpen(false)} onSent={() => {}} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ChatList({
  chats,
  loading,
  activeId,
  open,
  onNew,
  onOpen,
  onRename,
  onDelete,
}: {
  chats: QuoteListItem[];
  loading: boolean;
  activeId: number | null;
  /** Shown as an overlay on small screens; always visible on large ones. */
  open: boolean;
  onNew: () => void;
  onOpen: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onDelete: (c: QuoteListItem) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const startEdit = (c: QuoteListItem) => {
    setEditingId(c.id);
    setDraft(chatTitle(c));
  };
  const commit = () => {
    if (editingId != null && draft.trim()) onRename(editingId, draft);
    setEditingId(null);
  };

  return (
    <aside
      className={`card ${open ? 'absolute inset-x-4 z-20 flex max-h-[70vh]' : 'hidden'} w-auto flex-col lg:static lg:flex lg:max-h-none lg:w-72 lg:shrink-0`}
    >
      <div className="border-b border-slate-100 p-3">
        <button type="button" className="btn-primary w-full" onClick={onNew}>
          <PlusIcon className="h-4 w-4" />
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : chats.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-400">No chats yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {chats.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  {editingId === c.id ? (
                    <input
                      className="input py-1.5 text-sm"
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      maxLength={190}
                      aria-label="Chat name"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className={`w-full rounded-lg px-3 py-2 pr-16 text-left transition ${
                        active ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-100'
                      }`}
                    >
                      <p className="truncate text-sm font-medium">{chatTitle(c)}</p>
                      <p className="truncate text-xs text-slate-400">
                        {c.customer.name} · {chatDate(c.createdAt)}
                        {c.status !== 'COMPLETED' && ` · ${c.status.toLowerCase()}`}
                      </p>
                    </button>
                  )}
                  {editingId !== c.id && (
                    <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-brand-600"
                        aria-label={`Rename ${chatTitle(c)}`}
                        title="Rename"
                      >
                        <EditIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c)}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"
                        aria-label={`Delete ${chatTitle(c)}`}
                        title="Delete"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** The chat's name in the header — click the pencil to rename in place. */
function TitleEditor({ title, onSave }: { title: string; onSave: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title]);

  if (editing) {
    return (
      <input
        className="input py-1 text-sm font-semibold"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft.trim() !== title) onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(title);
            setEditing(false);
          }
        }}
        maxLength={190}
        aria-label="Chat name"
      />
    );
  }
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
      <span className="truncate">{title}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 text-slate-400 hover:text-brand-600"
        aria-label="Rename chat"
        title="Rename"
      >
        <EditIcon className="h-3.5 w-3.5" />
      </button>
    </h2>
  );
}

function Bubble({ message: m }: { message: QuoteMessage }) {
  const mine = m.role === 'USER';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-700'
        }`}
      >
        {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
        {m.attachments && m.attachments.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 ${m.content ? 'mt-2' : ''}`}>
            {m.attachments.map((a, i) => (
              <span
                key={`${a.name}:${i}`}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  mine ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                }`}
              >
                <PaperclipIcon className="h-3 w-3" />
                <span className="max-w-[14rem] truncate">{a.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** The downloadable Excel, with an optional expandable table of the priced lines. */
function QuoteFileCard({
  quote,
  showLines,
  linesOpen,
  onToggleLines,
  onEmail,
}: {
  quote: Quote;
  showLines: boolean;
  linesOpen: boolean;
  onToggleLines: () => void;
  onEmail?: () => void;
}) {
  const matched = quote.lines.filter((l) => l.catalogNo).length;
  const total = quote.lines.reduce((sum, l) => sum + (l.amount ? Number(l.amount) : 0), 0);
  const items = bomItemCount(quote);
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
            <FileIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800" title={quoteFileName(quote)}>
              {quoteFileName(quote)}
            </p>
            <p className="text-xs text-slate-400">
              {items != null
                ? `Excel spreadsheet · ${items} items`
                : `Excel spreadsheet · ${matched}/${quote.lines.length} lines`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => void downloadQuote(quote.id)} className="btn-ghost btn-sm">
              <DownloadIcon className="h-4 w-4" />
              Download
            </button>
            {onEmail && (
              <button type="button" onClick={onEmail} className="btn-primary btn-sm">
                <MailIcon className="h-4 w-4" />
                Email
              </button>
            )}
          </div>
        </div>
        {showLines && quote.lines.length > 0 && (
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={onToggleLines}
              className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-brand-600"
              aria-expanded={linesOpen}
            >
              <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${linesOpen ? 'rotate-90' : ''}`} />
              {linesOpen ? 'Hide' : 'View'} {quote.lines.length} lines · {matched} matched · Total ₹{inr.format(total)}
            </button>
            {linesOpen && (
              <div className="max-h-80 overflow-auto border-t border-slate-100">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Catalog No.</th>
                      <th className="px-2 py-1.5">Description</th>
                      <th className="px-2 py-1.5 text-right">Qty</th>
                      <th className="px-2 py-1.5 text-right">List</th>
                      <th className="px-2 py-1.5 text-right">Disc%</th>
                      <th className="px-2 py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lines.map((l) => {
                      const lowConf = !l.catalogNo || (l.confidence != null && Number(l.confidence) < 0.5);
                      return (
                        <tr key={l.id} className={`border-t border-slate-100 ${lowConf ? 'bg-amber-50/60' : ''}`}>
                          <td className="px-2 py-1.5 text-slate-400">{l.lineNo}</td>
                          <td className="px-2 py-1.5 font-mono">
                            {l.catalogNo ?? <span className="text-amber-600">review</span>}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600" title={l.matchNote ?? ''}>
                            {l.description ?? l.requirement}
                            {l.isAccessory && <span className="ml-1 text-slate-400">(acc)</span>}
                          </td>
                          <td className="px-2 py-1.5 text-right">{l.quantity}</td>
                          <td className="px-2 py-1.5 text-right">{money(l.listPrice)}</td>
                          <td className="px-2 py-1.5 text-right">{money(l.discountPct)}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{money(l.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Multi-select dropdown of the active brands, with "Select all". */
function BrandSelect({
  all,
  value,
  onChange,
  disabled,
}: {
  all: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const allSelected = all.length > 0 && value.length === all.length;
  const toggle = (b: string) =>
    onChange(value.includes(b) ? value.filter((x) => x !== b) : [...value, b]);

  if (all.length === 0) {
    return (
      <p className="input text-slate-400">No active brands — add one on the Brands page.</p>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left"
        disabled={disabled}
        aria-label="Brands"
      >
        <span className={`truncate ${value.length ? 'text-slate-700' : 'text-slate-400'}`}>
          {value.length === 0 ? '— Select brands —' : allSelected ? 'All brands' : value.join(', ')}
        </span>
        <span className="ml-2 shrink-0 text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute bottom-full z-20 mb-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 hover:bg-slate-50">
            <input type="checkbox" checked={allSelected} onChange={() => onChange(allSelected ? [] : [...all])} />
            <span className="text-sm font-medium text-slate-700">Select all</span>
          </label>
          {all.map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50">
              <input type="checkbox" checked={value.includes(b)} onChange={() => toggle(b)} />
              <span className="text-sm text-slate-700">{b}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
