import { useEffect, useState } from 'react';
import { TrashIcon } from '../icons';

/**
 * App-wide confirm / alert dialogs that replace the browser's window.confirm and
 * window.alert. Imperative API so any handler can `await confirmDialog(...)`;
 * <DialogHost /> (mounted once in App) renders the current dialog.
 */
export interface DialogOptions {
  title?: string;
  message: string;
  /** Button label for the confirming action. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destructive (red); primary = normal; info = alert only. */
  tone?: 'danger' | 'primary' | 'info';
}

interface Pending {
  kind: 'confirm' | 'alert';
  opts: DialogOptions;
  resolve: (ok: boolean) => void;
}

type Listener = (p: Pending | null) => void;
let listener: Listener | null = null;
let current: Pending | null = null;

function show(p: Pending) {
  current = p;
  listener?.(p);
}
function close(ok: boolean) {
  const p = current;
  current = null;
  listener?.(null);
  p?.resolve(ok);
}

/** Ask the user to confirm; resolves true on confirm, false on cancel / Escape. */
export function confirmDialog(opts: DialogOptions | string): Promise<boolean> {
  const o = typeof opts === 'string' ? { message: opts } : opts;
  return new Promise((resolve) => show({ kind: 'confirm', opts: o, resolve }));
}

/** Show a message with an OK button; resolves when dismissed. */
export function alertDialog(opts: DialogOptions | string): Promise<void> {
  const o = typeof opts === 'string' ? { message: opts } : opts;
  return new Promise((resolve) => show({ kind: 'alert', opts: { tone: 'info', ...o }, resolve: () => resolve() }));
}

function Glyph({ tone }: { tone: NonNullable<DialogOptions['tone']> }) {
  if (tone === 'danger') {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-glow">
        <TrashIcon className="h-6 w-6" />
      </span>
    );
  }
  if (tone === 'info') {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-glow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
          <path strokeLinecap="round" d="M12 9v4m0 4h.01" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.9 1.8 18.6A2 2 0 0 0 3.5 21.6h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8h.01M11 12h1v4h1" />
      </svg>
    </span>
  );
}

/** Renders the active dialog. Mount exactly once, near the app root. */
export default function DialogHost() {
  const [pending, setPending] = useState<Pending | null>(current);

  useEffect(() => {
    listener = setPending;
    return () => {
      listener = null;
    };
  }, []);

  // Escape cancels; Enter confirms.
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  if (!pending) return null;
  const { kind, opts } = pending;
  const tone = opts.tone ?? (kind === 'alert' ? 'info' : 'danger');
  const title = opts.title ?? (kind === 'alert' ? 'Notice' : tone === 'danger' ? 'Please confirm' : 'Confirm');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={() => close(false)}
      role="presentation"
    >
      <div
        role={kind === 'alert' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        className="w-full max-w-md animate-pop-in overflow-hidden rounded-2xl border border-white/70 bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          <Glyph tone={tone} />
          <div className="min-w-0 flex-1">
            <h2 id="app-dialog-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{opts.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          {kind === 'confirm' && (
            <button type="button" className="btn-ghost" onClick={() => close(false)} autoFocus>
              {opts.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={() => close(true)}
            autoFocus={kind === 'alert'}
          >
            {opts.confirmLabel ?? (kind === 'alert' ? 'OK' : tone === 'danger' ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
