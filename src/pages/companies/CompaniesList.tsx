import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteCompany,
  listCompanies,
  setCompanyStatus,
} from '../../api/companies';
import { apiErrorMessage } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import type { Company, CompanyStatus, Paginated } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import DataTable, { type Column } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { FileIcon, PlusIcon, SearchIcon } from '../../components/icons';

type Filter = 'ALL' | CompanyStatus;
const FILTERS: Filter[] = ['ALL', 'ACTIVE', 'INACTIVE'];

export default function CompaniesList() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const pageSize = settings.general.pageSize;
  const [rows, setRows] = useState<Company[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: Paginated<Company> = await listCompanies({
        page,
        limit: pageSize,
        ...(search ? { search } : {}),
        ...(filter !== 'ALL' ? { status: filter } : {}),
      });
      setRows(res.data);
      setMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (e: React.MouseEvent, c: Company) => {
    e.stopPropagation();
    const next = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await setCompanyStatus(c.id, next);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update status'));
    }
  };

  const handleDelete = async (e: React.MouseEvent, c: Company) => {
    e.stopPropagation();
    if (!window.confirm(`Delete brand "${c.name}"?`)) return;
    try {
      await deleteCompany(c.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete company'));
    }
  };

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      render: (c) => <span className="font-medium text-slate-800">{c.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (c) => c.description ?? <span className="text-slate-400">—</span>,
    },
    {
      key: 'priceLists',
      header: 'Reference files',
      align: 'center',
      render: (c) => {
        const count = c._count?.priceListDocuments ?? 0;
        return count > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <FileIcon className="h-3.5 w-3.5" />
            {count}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
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
            onClick={(e) => toggle(e, c)}
            className="font-medium text-amber-600 hover:text-amber-700"
          >
            {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/companies/${c.id}`);
            }}
            className="ml-4 font-medium text-slate-600 hover:text-slate-900"
          >
            View
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/companies/${c.id}/edit`);
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
        title="Brands"
        subtitle="Manage brands and their active status."
        actions={
          <>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-56 pl-9"
                placeholder="Search name…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            <button type="button" className="btn-primary" onClick={() => navigate('/companies/new')}>
              <PlusIcon className="h-4 w-4" />
              New brand
            </button>
          </>
        }
      />

      {/* Status filter tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setPage(1);
              setFilter(f);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === f ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Inactive'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        emptyMessage="No companies found."
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
