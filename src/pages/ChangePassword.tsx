import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { CheckCircleIcon, EyeIcon, KeyIcon, LockIcon } from '../components/icons';

/** What a strong password should have; each rule is shown as a live checklist item. */
const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Upper and lower case letters', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A symbol (e.g. ! ? # @)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: 'Too short', bar: 'bg-slate-200', text: 'text-slate-400' },
  { label: 'Weak', bar: 'bg-gradient-to-r from-rose-400 to-red-500', text: 'text-red-600' },
  { label: 'Fair', bar: 'bg-gradient-to-r from-amber-400 to-orange-500', text: 'text-amber-600' },
  { label: 'Good', bar: 'bg-gradient-to-r from-lime-400 to-emerald-500', text: 'text-emerald-600' },
  { label: 'Strong', bar: 'bg-gradient-to-r from-emerald-400 to-teal-600', text: 'text-emerald-700' },
];

/** A password box with a show/hide toggle. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="input pr-11"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={6}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className={`absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition ${
            show ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide' : 'Show'}
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Change the signed-in user's password (verifies the current one first). */
export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const passed = RULES.filter((r) => r.test(next)).length;
  const strength = next.length === 0 ? 0 : next.length < 6 ? 1 : Math.max(1, passed);
  const level = STRENGTH[Math.min(strength, STRENGTH.length - 1)]!;
  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    if (next === current) {
      setError('The new password must be different from the current one.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change your password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Change password" subtitle="Keep your account safe with a strong, unique password." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Left: who + tips */}
        <aside className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 p-6 text-white shadow-pop">
          <div aria-hidden className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
              <KeyIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-lg font-semibold">{user?.name}</p>
            <p className="text-sm text-white/75">{user?.email}</p>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/60">Tips</p>
            <ul className="mt-2 space-y-2 text-sm text-white/90">
              <li className="flex gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Use a phrase of several words — long beats clever.</li>
              <li className="flex gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Don’t reuse a password from another site.</li>
              <li className="flex gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />You stay signed in on this device after changing it.</li>
            </ul>
          </div>
        </aside>

        {/* Right: the form, or the success state */}
        <div className="card p-6 sm:p-8">
          {done ? (
            <div className="flex flex-col items-start">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
                <CheckCircleIcon className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-xl">Password changed</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your new password is in effect. Use it the next time you sign in.
              </p>
              <div className="mt-6 flex gap-2">
                <button type="button" className="btn-primary" onClick={() => navigate('/')}>
                  Go to dashboard
                </button>
                <Link to="/settings" className="btn-ghost">
                  Profile settings
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                  <LockIcon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base">Set a new password</h2>
                  <p className="text-sm text-slate-500">Confirm your current password, then choose a new one.</p>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <PasswordField
                id="cp-current"
                label="Current password"
                value={current}
                onChange={setCurrent}
                autoComplete="current-password"
                autoFocus
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <PasswordField
                  id="cp-new"
                  label="New password"
                  value={next}
                  onChange={setNext}
                  autoComplete="new-password"
                />
                <div>
                  <PasswordField
                    id="cp-confirm"
                    label="Confirm new password"
                    value={confirm}
                    onChange={setConfirm}
                    autoComplete="new-password"
                  />
                  {mismatch && <p className="mt-1.5 text-xs text-red-600">Does not match the new password.</p>}
                </div>
              </div>

              {/* Strength meter + live checklist */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Password strength</span>
                  <span className={`font-semibold ${level.text}`}>{next ? level.label : '—'}</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      key={n}
                      className={`h-1.5 rounded-full transition-all duration-300 ${n <= strength ? level.bar : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {RULES.map((r) => {
                    const ok = r.test(next);
                    return (
                      <li key={r.label} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                        <span
                          className={`grid h-4 w-4 place-items-center rounded-full ${
                            ok ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                          }`}
                        >
                          {ok && <CheckCircleIcon className="h-3 w-3" />}
                        </span>
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Link to="/settings" className="btn-ghost">
                  Cancel
                </Link>
                <button type="submit" className="btn-primary" disabled={busy || mismatch}>
                  <LockIcon className="h-4 w-4" />
                  {busy ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
