import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { changePassword, updateProfile } from '../../api/auth';
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

  // Password form
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

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

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setPwdErr('New passwords do not match.');
      return;
    }
    setSavingPwd(true);
    setPwdMsg('');
    setPwdErr('');
    try {
      const res = await changePassword(current, next);
      setPwdMsg(res.message);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setPwdErr(apiErrorMessage(err, 'Could not change your password'));
    } finally {
      setSavingPwd(false);
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
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
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

        {/* Change password */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-slate-400" />
                Reset password
              </span>
            }
          />
          <form onSubmit={savePassword}>
            <CardBody className="space-y-4">
              {pwdErr && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pwdErr}</div>
              )}
              {pwdMsg && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pwdMsg}</div>
              )}
              <div>
                <label className="label" htmlFor="pf-cur">Current password</label>
                <input
                  id="pf-cur"
                  type="password"
                  className="input"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="label" htmlFor="pf-new">New password</label>
                <input
                  id="pf-new"
                  type="password"
                  className="input"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label" htmlFor="pf-confirm">Confirm new password</label>
                <input
                  id="pf-confirm"
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>
            </CardBody>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button type="submit" className="btn-primary btn-sm" disabled={savingPwd}>
                <LockIcon className="h-4 w-4" />
                {savingPwd ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
