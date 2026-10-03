import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createUser,
  getUser,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from '../../api/users';
import { listRoles } from '../../api/roles';
import { apiErrorMessage } from '../../lib/api';
import type { Role } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { alertDialog } from '../../components/ui/Dialog';

export default function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [sendCredentials, setSendCredentials] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listRoles({ limit: 100 }), id ? getUser(id) : Promise.resolve(null)])
      .then(([roleRes, u]) => {
        setRoles(roleRes.data);
        if (u) {
          setName(u.name);
          setEmail(u.email);
          setRoleId(u.role?.id ?? '');
          setIsActive(u.isActive);
        }
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load user')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const payload: UpdateUserInput = {
          name: name.trim(),
          roleId: roleId || null,
          isActive,
        };
        if (password) payload.password = password;
        await updateUser(id!, payload);
      } else {
        const payload: CreateUserInput = {
          name: name.trim(),
          email: email.trim(),
          password,
          roleId: roleId || null,
          isActive,
          sendCredentials,
        };
        const created = await createUser(payload);
        // Best-effort credentials email — warn if it was requested but failed.
        const ce = created.credentialsEmail;
        if (sendCredentials && ce && !ce.sent) {
          await alertDialog({
            title: 'Credentials email not sent',
            message:
              `The user was created, but the credentials email could not be sent:\n\n${ce.error ?? 'unknown error'}\n\n` +
              `Check the SMTP configuration in Settings → Email (SMTP).`,
          });
        }
      }
      navigate('/users', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save user'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit user' : 'New user'}
        subtitle={isEdit ? 'Update this user and their role.' : 'Create a user and assign a role.'}
        actions={
          <button type="button" className="btn-ghost" onClick={() => navigate('/users')}>
            Back
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader title="User details" />
        {loading ? (
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardBody className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Name</label>
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input disabled:bg-slate-50 disabled:text-slate-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isEdit}
                    title={isEdit ? 'Email cannot be changed' : undefined}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="password">
                    {isEdit ? 'New password' : 'Password'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isEdit}
                    minLength={6}
                    placeholder={isEdit ? 'Leave blank to keep current' : ''}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="role">Role</label>
                  <select
                    id="role"
                    className="input"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">— No role (no access) —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-100">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <span className="font-medium text-slate-700">Active</span>
                  <span className="text-slate-400">— inactive users cannot sign in</span>
                </label>

                {!isEdit && (
                  <label className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-100">
                    <input
                      type="checkbox"
                      checked={sendCredentials}
                      onChange={(e) => setSendCredentials(e.target.checked)}
                    />
                    <span className="font-medium text-slate-700">Email login credentials</span>
                    <span className="text-slate-400">— send the email &amp; password to this user</span>
                  </label>
                )}
              </div>
            </CardBody>

            <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => navigate('/users')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Right: live preview of the account being created / edited. */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden">
          <div className="relative h-16 bg-gradient-to-r from-cyan-500/20 via-brand-500/15 to-violet-500/15" />
          <div className="-mt-7 px-5 pb-5">
            <Avatar name={name || 'User'} size="lg" className="rounded-2xl ring-4 ring-white shadow-pop" />
            <p className="mt-3 truncate text-base font-semibold text-slate-900">{name.trim() || 'New user'}</p>
            <p className="truncate text-sm text-slate-500">{email.trim() || 'No email yet'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={isActive ? 'green' : 'gray'}>{isActive ? 'Active' : 'Inactive'}</Badge>
              {roleId !== '' ? (
                <Badge tone="blue">{roles.find((r) => r.id === roleId)?.name ?? 'Role'}</Badge>
              ) : (
                <Badge tone="amber">No role · no access</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="card p-5 text-sm text-slate-600">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What happens next</p>
          <ul className="mt-2 space-y-2">
            <li>• The role decides which pages and actions this user can use; manage roles under Admin → Roles.</li>
            {!isEdit && (
              <li>
                • {sendCredentials
                  ? 'The sign-in email and password will be emailed to the user.'
                  : 'No email will be sent — share the password with the user yourself.'}
              </li>
            )}
            {isEdit && <li>• Leave the password blank to keep the current one.</li>}
          </ul>
        </div>
      </aside>
      </div>
    </div>
  );
}
