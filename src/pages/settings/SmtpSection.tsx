import { useEffect, useState } from 'react';
import { getSmtpSettings, updateSmtpSettings, type SmtpSettings } from '../../api/settings';
import { sendTestEmail } from '../../api/email';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { MailIcon, SendIcon } from '../../components/icons';

export default function SmtpSection() {
  const { can } = useAuth();
  const canEdit = can('settings.edit');

  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Test-email state.
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testErr, setTestErr] = useState('');

  const load = () => {
    setLoading(true);
    getSmtpSettings()
      .then((s) => {
        setSettings(s);
        setHost(s.host);
        setPort(s.port);
        setSecure(s.secure);
        setUsername(s.username);
        setFromName(s.fromName);
        setFromEmail(s.fromEmail);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load SMTP settings')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updateSmtpSettings({
        host,
        port,
        secure,
        username,
        password: password || undefined,
        fromName,
        fromEmail,
      });
      setSettings(updated);
      setPassword('');
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save SMTP settings'));
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestMsg('');
    setTestErr('');
    try {
      const res = await sendTestEmail(testTo.trim() || undefined);
      setTestMsg(`Test email sent to ${res.to}. Check the inbox to confirm.`);
    } catch (err) {
      setTestErr(apiErrorMessage(err, 'Could not send test email'));
    } finally {
      setTesting(false);
    }
  };

  const clearPassword = async () => {
    if (!window.confirm('Remove the stored SMTP password?')) return;
    setError('');
    try {
      const updated = await updateSmtpSettings({ clearPassword: true });
      setSettings(updated);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not remove password'));
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2">
          <MailIcon className="h-5 w-5 text-brand-500" />
          Email (SMTP)
        </h1>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          SMTP settings saved.
        </div>
      )}
      {!canEdit && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have read-only access to email settings.
        </div>
      )}

      {loading ? (
        <Card>
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="SMTP server"
              action={
                <span className={settings?.passwordSet ? 'badge-green' : 'badge-gray'}>
                  {settings?.passwordSet ? 'Password set' : 'No password'}
                </span>
              }
            />
            <CardBody className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="host">Host</label>
                <input
                  id="host"
                  className="input"
                  placeholder="smtp.gmail.com"
                  value={host}
                  disabled={!canEdit}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="port">Port</label>
                <input
                  id="port"
                  type="number"
                  min={1}
                  max={65535}
                  className="input"
                  value={port}
                  disabled={!canEdit}
                  onChange={(e) => setPort(Number(e.target.value) || 587)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={secure}
                    disabled={!canEdit}
                    onChange={(e) => setSecure(e.target.checked)}
                  />
                  Use TLS/SSL (port 465)
                </label>
              </div>
              <div>
                <label className="label" htmlFor="username">Username</label>
                <input
                  id="username"
                  className="input"
                  autoComplete="off"
                  value={username}
                  disabled={!canEdit}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder={settings?.passwordSet ? '•••••••• (leave blank to keep)' : ''}
                  value={password}
                  disabled={!canEdit}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {canEdit && settings?.passwordSet && (
                  <button
                    type="button"
                    onClick={clearPassword}
                    className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove stored password
                  </button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sender" />
            <CardBody className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="fromName">From name</label>
                <input
                  id="fromName"
                  className="input"
                  placeholder="Jobwork"
                  value={fromName}
                  disabled={!canEdit}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="fromEmail">From email</label>
                <input
                  id="fromEmail"
                  type="email"
                  className="input"
                  placeholder="no-reply@example.com"
                  value={fromEmail}
                  disabled={!canEdit}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>
            </CardBody>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader title="Send a test email" />
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-500">
                  Sends a test message using the settings above. Save your changes first — the test
                  uses the last saved configuration.
                </p>
                {testErr && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{testErr}</div>
                )}
                {testMsg && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {testMsg}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="label" htmlFor="testTo">Recipient (optional)</label>
                    <input
                      id="testTo"
                      type="email"
                      className="input"
                      placeholder="Defaults to your own email"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    onClick={() => void runTest()}
                    disabled={testing}
                  >
                    <SendIcon className="h-4 w-4" />
                    {testing ? 'Sending…' : 'Send test'}
                  </button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
