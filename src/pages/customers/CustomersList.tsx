import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteCustomer, listCustomers } from '../../api/customers';
import { apiErrorMessage } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import type { Customer, Paginated } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import DataTable, { type Column } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { PlusIcon, SearchIcon } from '../../components/icons';

export default function CustomersList() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const pageSize = settings.general.pageSize;
  const [rows, setRows] = useState<Customer[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: Paginated<Customer> = await listCustomers({
        page,
        limit: pageSize,
        ...(search ? { search } : {}),
      });
      setRows(res.data);
      setMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    if (!window.confirm(`Delete customer "${c.name}"?`)) return;
    try {
      await deleteCustomer(c.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete customer'));
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => <span className="font-medium text-slate-800">{c.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (c) => c.email ?? <span className="text-slate-400">—</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (c) => c.phone ?? <span className="text-slate-400">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge tone={c.status === 'ACTIVE' ? 'green' : 'gray'}>{c.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${c.id}`);
            }}
            className="font-medium text-slate-600 hover:text-slate-900"
          >
            View
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${c.id}/edit`);
            }}
            className="ml-4 font-medium text-brand-600 hover:text-brand-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => handleDelete(e, c)}
            className="ml-4 font-medium text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage your customers."
        actions={
          <>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-56 pl-9"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            <button type="button" className="btn-primary" onClick={() => navigate('/customers/new')}>
              <PlusIcon className="h-4 w-4" />
              New customer
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No customers found."
      />

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {meta.page} of {meta.totalPages} · {meta.total} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
