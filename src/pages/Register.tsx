import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/api';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <h1 className="text-2xl">Create account</h1>
        <p className="mt-1 text-sm text-slate-500">An administrator assigns your role after you join.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-5">
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
