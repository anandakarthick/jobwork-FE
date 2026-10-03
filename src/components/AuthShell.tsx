import type { ReactNode } from 'react';
import { BrandMark, useAppName } from './ui/Brand';
import { CheckCircleIcon, SparklesIcon } from './icons';

const HIGHLIGHTS = [
  'Upload a BOQ and get a priced quote in minutes',
  'Matches every line against your trained price lists',
  'Brand rules and reference files guide the AI',
  'Refine the quote in a chat, then download the Excel',
];

/**
 * Shared frame for the signed-out pages (sign in, forgot/reset password,
 * register): a colourful brand panel on the left (desktop) and the page's card
 * on the right over a soft glow. Pass the card's content as children.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  const appName = useAppName();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: colourful brand panel (desktop only). */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute right-1/4 top-10 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <BrandMark className="h-11 w-11 text-base shadow-pop" />
          <span className="text-xl font-semibold tracking-tight">{appName}</span>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25">
            <SparklesIcon className="h-3.5 w-3.5" />
            AI-assisted quotations
          </span>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white">
            From BOQ to priced quote, in one conversation.
          </h2>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-white/90">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} {appName}</p>
      </section>

      {/* Right: the page's card. */}
      <section className="relative grid place-items-center px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
        />
        <div className="card relative w-full max-w-sm animate-fade-up p-8 shadow-pop">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <BrandMark className="h-10 w-10 text-base shadow-glow" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">{appName}</span>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

/** A friendly status tile for the "done" states (email sent, password reset). */
export function AuthSuccess({ children }: { children: ReactNode }) {
  return (
    <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
      {children}
    </span>
  );
}
