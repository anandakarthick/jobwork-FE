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
          window.alert(
            `User created, but the credentials email could not be sent:\n\n${ce.error ?? 'unknown error'}\n\n` +
              `Check the SMTP configuration in Settings → Email (SMTP).`,
          );
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
    <div className="mx-auto max-w-3xl">
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
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

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

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <span className="font-medium text-slate-700">Active</span>
                <span className="text-slate-400">— inactive users cannot sign in</span>
              </label>

              {!isEdit && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendCredentials}
                    onChange={(e) => setSendCredentials(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">Email login credentials</span>
                  <span className="text-slate-400">— send the email &amp; password to this user</span>
                </label>
              )}
            </CardBody>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
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
    </div>
  );
}
