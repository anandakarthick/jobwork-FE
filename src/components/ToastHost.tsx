import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { dismissToast, type Toast } from '../store/ingestJobsSlice';
import { CheckCircleIcon, ClockIcon } from './icons';

const TONE: Record<Toast['tone'], { ring: string; text: string; Icon: typeof CheckCircleIcon }> = {
  success: { ring: 'border-green-200 bg-green-50', text: 'text-green-800', Icon: CheckCircleIcon },
  error: { ring: 'border-red-200 bg-red-50', text: 'text-red-800', Icon: ClockIcon },
  info: { ring: 'border-slate-200 bg-white', text: 'text-slate-700', Icon: ClockIcon },
};

/** Auto-dismissing toast; errors linger longer so they can be read/copied. */
function ToastCard({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const { ring, text, Icon } = TONE[toast.tone];
  useEffect(() => {
    const ms = toast.tone === 'error' ? 12000 : 6000;
    const timer = window.setTimeout(() => dispatch(dismissToast(toast.id)), ms);
    return () => window.clearTimeout(timer);
  }, [dispatch, toast.id, toast.tone]);

  return (
    <div className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg ${ring}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} />
      <p className={`flex-1 text-sm ${text}`}>{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        className={`shrink-0 text-lg leading-none ${text} opacity-60 hover:opacity-100`}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Fixed, app-level stack of notifications (bottom-right). Driven by the
 * ingestJobs slice, so background-ingest completion/failure messages appear on
 * whatever page the user is on.
 */
export default function ToastHost() {
  const toasts = useAppSelector((s) => s.ingestJobs.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
