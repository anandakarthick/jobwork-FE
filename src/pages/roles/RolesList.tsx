import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteRole, listRoles } from '../../api/roles';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { Paginated, Role } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import DataTable, { type Column } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { PlusIcon } from '../../components/icons';

export default function RolesList() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: Paginated<Role> = await listRoles({ limit: 100 });
      setRows(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (e: React.MouseEvent, role: Role) => {
    e.stopPropagation();
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      await deleteRole(role.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete role'));
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => (
        <span className="font-medium text-slate-800">
          {r.name}
          {r.isSystem && <span className="ml-2 badge-gray">system</span>}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => r.description ?? <span className="text-slate-400">—</span>,
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (r) =>
        r.permissions.includes('*') ? (
          <Badge tone="green">All access</Badge>
        ) : (
          <Badge tone="blue">{r.permissions.length}</Badge>
        ),
    },
    {
      key: 'users',
      header: 'Users',
      align: 'center',
      render: (r) => r._count?.users ?? 0,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="whitespace-nowrap">
          {can('roles.edit') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/roles/${r.id}/edit`);
              }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          )}
          {can('roles.delete') && !r.isSystem && (
            <button
              type="button"
              onClick={(e) => handleDelete(e, r)}
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
        title="Roles"
        subtitle="Define roles and the permissions each grants."
        actions={
          can('roles.create') && (
            <button type="button" className="btn-primary" onClick={() => navigate('/roles/new')}>
              <PlusIcon className="h-4 w-4" />
              New role
            </button>
          )
        }
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No roles found."
      />
    </div>
  );
}
