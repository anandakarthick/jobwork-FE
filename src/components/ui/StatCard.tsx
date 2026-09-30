import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** Accent colour for the icon chip. */
  tone?: 'blue' | 'green' | 'amber' | 'slate';
}

const toneChip: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatCard({ label, value, hint, icon, tone = 'blue' }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneChip[tone]}`}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
