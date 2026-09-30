import { useEffect, useState } from 'react';
import { listCompanies } from '../../api/companies';
import { apiErrorMessage } from '../../lib/api';
import type { Company } from '../../types';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Brand selector whose options come from the Companies list — a brand IS a
 * company (by name). Stored as string[] in the category's `brands` column, so
 * any pre-existing free-text brands still show as (legacy) removable chips.
 */
export default function BrandPicker({ value, onChange }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listCompanies({ page: 1, limit: 100 })
      .then((res) => setCompanies(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load companies')))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  if (loading) return <p className="text-sm text-slate-400">Loading companies…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const companyNames = companies.map((c) => c.name);
  // Values previously stored that aren't companies (old free-text brands).
  const legacy = value.filter((v) => !companyNames.includes(v));

  if (companies.length === 0 && legacy.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No companies yet — add some in the Companies section first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {companies.map((c) => {
        const selected = value.includes(c.name);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.name)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
              selected
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            {c.name}
            {selected && <span className="text-brand-500">✓</span>}
          </button>
        );
      })}

      {legacy.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => toggle(name)}
          title="Legacy brand (not a company)"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
        >
          {name}
          <span>×</span>
        </button>
      ))}
    </div>
  );
}
