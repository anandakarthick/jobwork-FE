import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createRole,
  getPermissionCatalogue,
  getRole,
  updateRole,
  type RoleInput,
} from '../../api/roles';
import { apiErrorMessage } from '../../lib/api';
import type { PermissionGroup } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';

export default function RoleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fullAccess, setFullAccess] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getPermissionCatalogue(), id ? getRole(id) : Promise.resolve(null)])
      .then(([cat, role]) => {
        setGroups(cat);
        if (role) {
          setName(role.name);
          setDescription(role.description ?? '');
          if (role.permissions.includes('*')) {
            setFullAccess(true);
          } else {
            setSelected(new Set(role.permissions));
          }
        }
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load role')))
      .finally(() => setLoading(false));
  }, [id]);

  const allKeys = useMemo(
    () => groups.flatMap((g) => g.permissions.map((p) => p.key)),
    [groups],
  );

  // create/edit/delete imply view: enabling a write auto-enables view;
  // disabling view clears that module's writes.
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const [mod, action] = key.split('.');
      if (next.has(key)) {
        next.delete(key);
        if (action === 'view') {
          for (const k of Array.from(next)) {
            const [m, a] = k.split('.');
            if (m === mod && a !== 'view') next.delete(k);
          }
        }
      } else {
        next.add(key);
        if (action !== 'view') next.add(`${mod}.view`);
      }
      return next;
    });

  const toggleGroup = (g: PermissionGroup, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      g.permissions.forEach((p) => (on ? next.add(p.key) : next.delete(p.key)));
      return next;
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required.');
    const permissions = fullAccess ? ['*'] : Array.from(selected);
    if (permissions.length === 0) return setError('Select at least one permission.');
    setSaving(true);
    setError('');
    try {
      const payload: RoleInput = { name: name.trim(), description: description.trim() || null, permissions };
      const saved = isEdit ? await updateRole(id!, payload) : await createRole(payload);
      void saved;
      navigate('/roles', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save role'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit role' : 'New role'}
        subtitle="Choose exactly what this role can do."
        actions={
          <button type="button" className="btn-ghost" onClick={() => navigate('/roles')}>
            Back
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader title="Role details" />
        {loading ? (
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardBody className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Name</label>
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="desc">Description</label>
                  <input id="desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5 text-sm ring-1 ring-inset ring-amber-100">
                <input type="checkbox" checked={fullAccess} onChange={(e) => setFullAccess(e.target.checked)} />
                <span className="font-medium text-slate-700">Full access</span>
                <span className="text-slate-500">— grants every permission (superadmin)</span>
              </label>

              {!fullAccess && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                  {groups.map((g) => {
                    const keys = g.permissions.map((p) => p.key);
                    const allOn = keys.every((k) => selected.has(k));
                    const viewKey = g.permissions.find((p) => p.key.endsWith('.view'))?.key;
                    const hasWrite = g.permissions.some(
                      (p) => !p.key.endsWith('.view') && selected.has(p.key),
                    );
                    return (
                      <div
                        key={g.module}
                        className={`rounded-xl border p-3 transition-colors ${
                          allOn
                            ? 'border-brand-200 bg-brand-50/40'
                            : keys.some((k) => selected.has(k))
                              ? 'border-slate-200 bg-white'
                              : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-800">{g.module}</h3>
                          <button
                            type="button"
                            onClick={() => toggleGroup(g, !allOn)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            {allOn ? 'Clear all' : 'Select all'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {g.permissions.map((p) => {
                            const locked = p.key === viewKey && hasWrite;
                            return (
                              <label
                                key={p.key}
                                title={locked ? 'Required by the selected create/edit/delete permissions' : undefined}
                                className={`flex items-center gap-1.5 text-sm ${locked ? 'text-slate-400' : 'text-slate-600'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.has(p.key) || locked}
                                  disabled={locked}
                                  onChange={() => toggle(p.key)}
                                />
                                {p.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  <p className="text-xs text-slate-400">
                    {selected.size} of {allKeys.length} permissions selected
                  </p>
                </div>
              )}
            </CardBody>

            <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => navigate('/roles')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create role'}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Right: live summary of what the role grants. */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden">
          <div className="relative h-16 bg-gradient-to-r from-rose-500/20 via-violet-500/15 to-brand-500/15" />
          <div className="-mt-7 px-5 pb-5">
            <Avatar name={name || 'Role'} size="lg" className="rounded-2xl ring-4 ring-white shadow-pop" />
            <p className="mt-3 truncate text-base font-semibold text-slate-900">{name.trim() || 'New role'}</p>
            <p className="truncate text-sm text-slate-500">{description.trim() || 'No description yet'}</p>
            <div className="mt-3">
              {fullAccess ? (
                <Badge tone="amber">Full access · every permission</Badge>
              ) : (
                <Badge tone={selected.size ? 'green' : 'gray'}>
                  {selected.size} of {allKeys.length} permissions
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!fullAccess && (
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">By module</p>
            <ul className="mt-2 space-y-1.5">
              {groups.map((g) => {
                const n = g.permissions.filter((p) => selected.has(p.key)).length;
                return (
                  <li key={g.module} className="flex items-center justify-between text-sm">
                    <span className={n ? 'text-slate-700' : 'text-slate-400'}>{g.module}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        n === g.permissions.length
                          ? 'bg-emerald-50 text-emerald-700'
                          : n
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {n}/{g.permissions.length}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}
