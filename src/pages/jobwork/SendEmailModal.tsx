import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage } from '../../lib/api';
import { getQuotePrefill, sendQuoteEmail } from '../../api/email';
import { getLetterhead, type Letterhead } from '../../api/settings';
import type { Quote } from '../../api/quotes';
import { useAppSelector } from '../../store/hooks';
import { FileIcon, MailIcon, SendIcon } from '../../components/icons';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** Mirror of the server's text→HTML paragraph conversion, for the live preview. */
function messageToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SendEmailModal({
  quote,
  onClose,
  onSent,
}: {
  quote: Quote;
  onClose: () => void;
  onSent: () => void;
}) {
  const appName = useAppSelector((s) => s.appSettings.appName);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachQuote, setAttachQuote] = useState(true);
  // Uploaded input documents — all checked by default.
  const [docChecked, setDocChecked] = useState<Record<number, boolean>>(
    Object.fromEntries(quote.documents.map((d) => [d.id, true])),
  );
  const [letterhead, setLetterhead] = useState<Letterhead | null>(null);
  const [tab, setTab] = useState<'preview' | 'edit'>('preview');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getQuotePrefill(quote.id), getLetterhead()])
      .then(([prefill, lh]) => {
        if (!alive) return;
        setTo(prefill.to);
        setSubject(prefill.subject);
        setMessage(prefill.message);
        setLetterhead(lh);
      })
      .catch((err) => alive && setError(apiErrorMessage(err, 'Could not load the compose form')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [quote.id]);

  // Wrap the typed message in the letter-pad design for the preview.
  const previewHtml = useMemo(() => {
    const content = messageToHtml(message);
    const today = new Date();
    const date = `${String(today.getDate()).padStart(2, '0')}.${String(
      today.getMonth() + 1,
    ).padStart(2, '0')}.${today.getFullYear()}`;
    if (!letterhead || !letterhead.enabled || !letterhead.html) {
      return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#374151;padding:16px;">${content}</div>`;
    }
    return letterhead.html
      .replace(/\{\{\s*content\s*\}\}/gi, content)
      .replace(/\{\{\s*(title|quote_title)\s*\}\}/gi, 'Quotation')
      .replace(/\{\{\s*(company_name|company|app_name)\s*\}\}/gi, appName || 'Your Company')
      .replace(/\{\{\s*logo\s*\}\}/gi, '')
      .replace(/\{\{\s*date\s*\}\}/gi, date);
  }, [message, letterhead, appName]);

  const selectedCount = (attachQuote ? 1 : 0) + Object.values(docChecked).filter(Boolean).length;

  const send = async () => {
    // Recipients: split the To field on comma / semicolon / whitespace.
    const recipients = to
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0) return setError('Enter at least one recipient email address.');
    if (!subject.trim() || !message.trim()) return setError('Subject and message are required.');
    setSending(true);
    setError('');
    try {
      await sendQuoteEmail({
        quoteId: quote.id,
        to: recipients,
        subject,
        message,
        attachQuote,
        documentIds: quote.documents.filter((d) => docChecked[d.id]).map((d) => d.id),
      });
      setSent(true);
      onSent();
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the email'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <MailIcon className="h-5 w-5 text-brand-500" />
            Send quote by email
          </h2>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading…</div>
          ) : (
            <div className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              {sent && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Email sent to {to}.
                </div>
              )}

              <div>
                <label className="label" htmlFor="em-to">To</label>
                <input
                  id="em-to"
                  className="input"
                  placeholder="customer@example.com, another@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  The customer's email is filled in. Add more recipients separated by commas.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="em-subject">Subject</label>
                <input
                  id="em-subject"
                  className="input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Attachments — all checked by default; uncheck to skip */}
              <div>
                <label className="label">Attachments ({selectedCount} selected)</label>
                <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
                  <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={attachQuote}
                      onChange={(e) => setAttachQuote(e.target.checked)}
                    />
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-600">
                      <FileIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-700">
                        Generated quote (.xlsx)
                      </span>
                      <span className="text-xs text-slate-400">Excel spreadsheet</span>
                    </span>
                  </label>

                  {quote.documents.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={Boolean(docChecked[d.id])}
                        onChange={(e) =>
                          setDocChecked((prev) => ({ ...prev, [d.id]: e.target.checked }))
                        }
                      />
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-slate-100 text-slate-500">
                        <FileIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-700" title={d.fileName}>
                          {d.fileName}
                        </span>
                        <span className="text-xs text-slate-400">
                          Uploaded document · {formatSize(d.sizeBytes)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="label mb-0">Message</label>
                  <div className="flex gap-1">
                    {(['preview', 'edit'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          tab === t ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {t === 'preview' ? 'Preview' : 'Edit message'}
                      </button>
                    ))}
                  </div>
                </div>
                {tab === 'preview' ? (
                  <iframe
                    title="Email preview"
                    className="h-[280px] w-full rounded-lg border border-slate-200 bg-white"
                    sandbox=""
                    srcDoc={previewHtml}
                  />
                ) : (
                  <textarea
                    className="input min-h-[200px] resize-y text-sm leading-relaxed"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  Sent on your letter pad (Settings → Email Template). The preview shows what the
                  recipient sees.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => void send()}
            disabled={sending || loading || sent}
          >
            <SendIcon className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
