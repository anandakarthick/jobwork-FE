import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteCustomer, getCustomer } from '../../api/customers';
import { listQuotes, downloadQuote, type QuoteListItem } from '../../api/quotes';
import { apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import type { Customer } from '../../types';
import { DetailField, DetailHero, Empty } from '../../components/ui/Detail';
import Badge from '../../components/ui/Badge';
import { DownloadIcon, EditIcon } from '../../components/icons';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { confirmDialog } from '../../components/ui/Dialog';

export default function CustomerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCustomer(id)
      .then(setCustomer)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load customer')))
      .finally(() => setLoading(false));

    setQuotesLoading(true);
    listQuotes({ customerId: Number(id), page: 1, limit: 50 })
      .then((res) => setQuotes(res.data))
      .catch(() => setQuotes([]))
      .finally(() => setQuotesLoading(false));
  }, [id]);

  const statusTone = (s: QuoteListItem['status']) =>
    s === 'COMPLETED' ? 'green' : s === 'FAILED' ? 'red' : 'amber';

  const handleDelete = async () => {
    if (!customer) return;
    if (
      !(await confirmDialog({
        title: 'Delete customer',
        message: `Delete customer "${customer.name}"? Their quotes and chats are removed too.`,
      }))
    )
      return;
    try {
      await deleteCustomer(customer.id);
      navigate('/customers', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete customer'));
    }
  };

  return (
    <div>
      <DetailHero
        name={loading ? 'Customer' : (customer?.name ?? 'Customer')}
        subtitle={customer?.email || 'Customer'}
        meta={
          customer && (
            <>
              <Badge tone={customer.status === 'ACTIVE' ? 'green' : 'gray'}>{customer.status}</Badge>
              <Badge tone="blue">{quotes.length} quote{quotes.length === 1 ? '' : 's'}</Badge>
              <span>Created {formatDate(customer.createdAt, settings.general.dateFormat)}</span>
            </>
          )
        }
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => navigate('/customers')}>
              Back
            </button>
            {customer && (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate(`/customers/${customer.id}/edit`)}
                >
                  <EditIcon className="h-4 w-4" />
                  Edit
                </button>
                <button type="button" className="btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Customer details" />
        <CardBody>
          {loading && <p className="py-8 text-center text-slate-400">Loading…</p>}
          {!loading && customer && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailField label="Customer name">{customer.name}</DetailField>
              <DetailField label="Status">
                <Badge tone={customer.status === 'ACTIVE' ? 'green' : 'gray'}>{customer.status}</Badge>
              </DetailField>
              <DetailField label="Email">{customer.email || <Empty />}</DetailField>
              <DetailField label="Phone">{customer.phone || <Empty />}</DetailField>
              <DetailField label="Address" className="sm:col-span-2">
                {customer.address ? <span className="whitespace-pre-wrap">{customer.address}</span> : <Empty />}
              </DetailField>
              <DetailField label="Created by">{customer.createdBy?.name ?? <Empty />}</DetailField>
              <DetailField label="Created at">
                {formatDate(customer.createdAt, settings.general.dateFormat)}
              </DetailField>
            </dl>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Quote history" />
        <CardBody>
          {quotesLoading && <p className="py-8 text-center text-slate-400">Loading…</p>}
          {!quotesLoading && quotes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No quotes generated for this customer yet.
            </p>
          )}
          {!quotesLoading && quotes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2">Date &amp; time</th>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Brand</th>
                    <th className="px-2 py-2 text-right">Lines</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2 text-right">File</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-600">
                        {formatDate(q.createdAt, settings.general.dateFormat)}
                      </td>
                      <td className="px-2 py-2 text-slate-800">
                        {q.category?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2">
                        {q.brand ? <Badge tone="blue">{q.brand}</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600">{q._count.lines}</td>
                      <td className="px-2 py-2">
                        <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {q.status === 'COMPLETED' ? (
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() =>
                              void downloadQuote(
                                q.id,
                                `${(q.title ?? `quote-${q.id}`).replace(/[^\w.-]+/g, '_')}.xlsx`,
                              )
                            }
                          >
                            <DownloadIcon className="h-4 w-4" />
                            .xlsx
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
