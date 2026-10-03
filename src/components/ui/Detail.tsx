import type { ReactNode } from 'react';
import Avatar from './Avatar';

/**
 * Hero band at the top of a view page: a large coloured avatar, the record's
 * name, a line of meta (badges, dates) and the page actions — in place of the
 * plain page title.
 */
export function DetailHero({
  name,
  subtitle,
  meta,
  actions,
}: {
  name: string;
  subtitle?: ReactNode;
  /** Badges / short facts shown under the name. */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card relative mb-6 overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-brand-500/15 via-violet-500/10 to-emerald-400/10" />
      <div className="relative flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-10">
        <div className="flex min-w-0 items-end gap-4">
          <Avatar name={name} size="lg" className="h-16 w-16 rounded-2xl text-xl ring-4 ring-white shadow-pop" />
          <div className="min-w-0 pb-0.5">
            <h1 className="truncate text-2xl">{name}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}

/** One labelled value on a view page, as a soft tile. */
export function DetailField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-inset ring-slate-100 ${className}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

/** Placeholder for an empty value. */
export const Empty = () => <span className="text-slate-400">—</span>;
