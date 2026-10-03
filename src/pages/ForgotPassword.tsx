import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { apiErrorMessage } from '../lib/api';
import AuthShell, { AuthSuccess } from '../components/AuthShell';
import { MailIcon } from '../components/icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset link'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      {sent ? (
        <div>
          <AuthSuccess>
            <MailIcon className="h-6 w-6" />
          </AuthSuccess>
          <h1 className="text-2xl">Check your email</h1>
          <p className="mt-2 text-sm text-slate-500">
            If an account exists for <strong>{email}</strong>, we've sent a password reset link to
            it. The link expires in 30 minutes.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Didn't get it? Check your spam folder, or{' '}
            <button
              type="button"
              className="font-medium text-brand-600 hover:text-brand-700"
              onClick={() => setSent(false)}
            >
              try again
            </button>
            .
          </p>
          <Link to="/login" className="btn-primary mt-6 w-full justify-center">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1 className="text-2xl">Forgot password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your account email and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="mt-5">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
