import type { ReactNode } from 'react';
import { TILE, type Accent } from '../../lib/colors';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** Accent colour of the card's tint and icon tile. */
  tone?: 'blue' | 'green' | 'amber' | 'slate' | 'violet' | 'rose';
}

const ACCENT: Record<NonNullable<StatCardProps['tone']>, Accent | null> = {
  blue: 'blue',
  green: 'emerald',
  amber: 'amber',
  violet: 'violet',
  rose: 'rose',
  slate: null,
};

// Soft wash behind the card's content, matching the icon tile's colour.
const WASH: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'from-blue-50/90 via-white to-white',
  green: 'from-emerald-50/90 via-white to-white',
  amber: 'from-amber-50/90 via-white to-white',
  violet: 'from-violet-50/90 via-white to-white',
  rose: 'from-rose-50/90 via-white to-white',
  slate: 'from-slate-50 via-white to-white',
};

export default function StatCard({ label, value, hint, icon, tone = 'blue' }: StatCardProps) {
  const accent = ACCENT[tone];
  return (
    <div
      className={`card relative overflow-hidden bg-gradient-to-br p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${WASH[tone]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <span
            className={`grid h-11 w-11 place-items-center rounded-xl shadow-sm ${
              accent ? TILE[accent] : 'bg-slate-800 text-white'
            }`}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
