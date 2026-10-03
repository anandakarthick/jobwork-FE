import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned actions, e.g. a "New" button or a search box. */
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        {/* Brand-coloured accent bar beside the title. */}
        <span aria-hidden className="mt-1.5 h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-brand-400 via-brand-600 to-violet-500" />
        <div>
          <h1 className="text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
