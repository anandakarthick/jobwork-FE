import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { listCompanies } from '../api/companies';
import { listCustomers } from '../api/customers';
import { listQuotes, type QuoteListItem } from '../api/quotes';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import StatCard from '../components/ui/StatCard';
import { Card, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
  BuildingIcon,
  ChevronRightIcon,
  ContactIcon,
  FileIcon,
  SparklesIcon,
  UsersIcon,
} from '../components/icons';

export default function Dashboard() {
  const { user, can } = useAuth();
  const { settings } = useSettings();
  const canCustomers = can('customers.view');
  const canBrands = can('companies.view');
  const canQuotes = can('jobwork.view');

  const [customerTotal, setCustomerTotal] = useState<number | null>(null);
  const [brandTotal, setBrandTotal] = useState<number | null>(null);
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [error, setError] = useState('');

  // Each figure is only fetched when the user's role may see that module.
  useEffect(() => {
    const fail = (err: unknown) => setError(apiErrorMessage(err));
    if (canCustomers) {
      listCustomers({ page: 1, limit: 1 })
        .then((res) => setCustomerTotal(res.meta.total))
        .catch(fail);
    }
    if (canBrands) {
      listCompanies({ page: 1, limit: 1 })
        .then((res) => setBrandTotal(res.meta.total))
        .catch(fail);
    }
    if (canQuotes) {
      listQuotes({ page: 1, limit: 6 })
        .then((res) => {
          setQuotes(res.data);
          setQuoteTotal(res.meta.total);
        })
        .catch(fail);
    }
  }, [canCustomers, canBrands, canQuotes]);

  const statusTone = (s: QuoteListItem['status']) =>
    s === 'COMPLETED' ? 'green' : s === 'FAILED' ? 'red' : 'amber';

  return (
    <div>
      {/* Hero band: greeting + a shortcut into Get Quote. */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-7 text-white shadow-pop sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-white/80">Overview of your customers, brands and quotes.</p>
          </div>
          {canQuotes && (
            <Link
              to="/jobwork"
              className="btn inline-flex bg-white text-brand-700 shadow-pop hover:bg-brand-50 focus-visible:ring-white/50"
            >
              <SparklesIcon className="h-4 w-4" />
              New quote
            </Link>
          )}
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canCustomers && (
          <StatCard label="Customers" value={customerTotal ?? '—'} icon={<ContactIcon />} tone="blue" />
        )}
        {canBrands && (
          <StatCard label="Brands" value={brandTotal ?? '—'} icon={<BuildingIcon />} tone="green" />
        )}
        {canQuotes && (
          <StatCard label="Quotes" value={quoteTotal ?? '—'} icon={<SparklesIcon />} tone="amber" />
        )}
        <StatCard label="Your role" value={user?.role?.name ?? '—'} icon={<UsersIcon />} tone="violet" />
      </div>

      {canQuotes && (
        <div className="mt-6">
          <Card>
            <CardHeader
              title="Recent quotes"
              action={
                <Link
                  to="/jobwork"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Get Quote <ChevronRightIcon className="h-4 w-4" />
                </Link>
              }
            />
            <ul className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <FileIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{q.customer.name}</p>
                      <p className="text-xs text-slate-400">
                        Quote #{q.id} · {formatDate(q.createdAt, settings.general.dateFormat)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {q.brand && <Badge tone="blue">{q.brand}</Badge>}
                    <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                  </div>
                </li>
              ))}
              {quotes.length === 0 && !error && (
                <li className="px-5 py-8 text-center text-sm text-slate-400">No quotes yet.</li>
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
