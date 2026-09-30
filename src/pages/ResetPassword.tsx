import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { apiErrorMessage } from '../lib/api';
import { BrandMark, useAppName } from '../components/ui/Brand';

export default function ResetPassword() {
  const appName = useAppName();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset the password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark className="h-9 w-9 text-base" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">{appName}</span>
        </div>

        {done ? (
          <div>
            <h1>Password reset</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <button
              type="button"
              className="btn-primary mt-6 w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to sign in
            </button>
          </div>
        ) : !token ? (
          <div>
            <h1>Invalid link</h1>
            <p className="mt-2 text-sm text-slate-500">
              This password reset link is missing its token. Please request a new one.
            </p>
            <Link to="/forgot-password" className="btn-primary mt-6 w-full justify-center">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1>Set a new password</h1>
            <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
                {/expired|invalid|start again/i.test(error) && (
                  <>
                    {' '}
                    <Link to="/forgot-password" className="font-medium underline">
                      Request a new link
                    </Link>
                  </>
                )}
              </div>
            )}

            <div className="mt-5">
              <label className="label" htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                autoComplete="new-password"
              />
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
