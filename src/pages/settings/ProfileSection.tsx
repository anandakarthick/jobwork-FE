import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/auth';
import { apiErrorMessage } from '../../lib/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { IdIcon, LockIcon, SaveIcon } from '../../components/icons';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function ProfileSection() {
  const { user, updateUser } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      const updated = await updateProfile({ name: name.trim(), phone: phone.trim() || null });
      updateUser(updated);
      setProfileMsg('Profile updated.');
    } catch (err) {
      setProfileErr(apiErrorMessage(err, 'Could not update your profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const memberSince = new Date(user.createdAt).toLocaleDateString();

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <IdIcon className="h-5 w-5 text-brand-500" />
        <h1 className="!mb-0">Profile Settings</h1>
      </div>

      {/* Identity banner */}
      <Card className="mb-6">
        <CardBody className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-xl font-bold text-white shadow-glow">
            {initials(user.name) || '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="badge-gray">{user.role?.name ?? 'No role'}</span>
              <span>Member since {memberSince}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader title="Your details" />
          <form onSubmit={saveProfile}>
            <CardBody className="space-y-4">
              {profileErr && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{profileErr}</div>
              )}
              {profileMsg && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {profileMsg}
                </div>
              )}
              <div>
                <label className="label" htmlFor="pf-name">Name</label>
                <input
                  id="pf-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="pf-email">Email</label>
                <input
                  id="pf-email"
                  className="input disabled:bg-slate-50 disabled:text-slate-400"
                  value={user.email}
                  disabled
                  title="Email cannot be changed"
                />
              </div>
              <div>
                <label className="label" htmlFor="pf-phone">Phone number</label>
                <input
                  id="pf-phone"
                  className="input"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                />
              </div>
            </CardBody>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button type="submit" className="btn-primary btn-sm" disabled={savingProfile}>
                <SaveIcon className="h-4 w-4" />
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Card>

        {/* Security — the password has its own page with a strength meter. */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-slate-400" />
                Security
              </span>
            }
          />
          <CardBody>
            <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 ring-1 ring-inset ring-brand-100">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-sm">
                <LockIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">Password</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Change your password regularly and never reuse one from another site.
                </p>
                <Link to="/change-password" className="btn-primary btn-sm mt-3">
                  <LockIcon className="h-4 w-4" />
                  Change password
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
