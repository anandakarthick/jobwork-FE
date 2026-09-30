import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser, listUsers } from '../../api/users';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { ManagedUser, Paginated } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import DataTable, { type Column } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { PlusIcon, SearchIcon } from '../../components/icons';

export default function UsersList() {
  const navigate = useNavigate();
  const { can, user: current } = useAuth();
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: Paginated<ManagedUser> = await listUsers({
        page,
        limit: 10,
        ...(search ? { search } : {}),
      });
      setRows(res.data);
      setMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (e: React.MouseEvent, u: ManagedUser) => {
    e.stopPropagation();
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await deleteUser(u.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete user'));
    }
  };

  const columns: Column<ManagedUser>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-slate-800">{u.name}</span> },
    { key: 'email', header: 'Email', render: (u) => u.email },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (u.role ? <Badge tone="blue">{u.role.name}</Badge> : <span className="text-slate-400">—</span>),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="whitespace-nowrap">
          {can('users.edit') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/users/${u.id}/edit`);
              }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          )}
          {can('users.delete') && u.id !== current?.id && (
            <button
              type="button"
              onClick={(e) => handleDelete(e, u)}
              className="ml-4 font-medium text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Create users and assign their roles."
        actions={
          <>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-56 pl-9"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            {can('users.create') && (
              <button type="button" className="btn-primary" onClick={() => navigate('/users/new')}>
                <PlusIcon className="h-4 w-4" />
                New user
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage="No users found."
      />

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Page {meta.page} of {meta.totalPages} · {meta.total} total</span>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button type="button" className="btn-ghost btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
