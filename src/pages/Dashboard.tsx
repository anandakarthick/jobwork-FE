import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { listCompanies } from '../api/companies';
import { listCustomers } from '../api/customers';
import { listQuotes, type QuoteListItem } from '../api/quotes';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import PageHeader from '../components/ui/PageHeader';
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
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle="Overview of your customers, brands and quotes."
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
        <StatCard label="Your role" value={user?.role?.name ?? '—'} icon={<UsersIcon />} tone="slate" />
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
