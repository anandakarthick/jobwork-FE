import { useEffect, useState } from 'react';
import {
  getNotificationSettings,
  sendTrainingSampleEmail,
  updateNotificationSettings,
  type NotificationSettings,
} from '../../api/settings';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { BellIcon, SendIcon } from '../../components/icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One address per line (commas and semicolons also accepted) → clean list. */
function parseRecipients(raw: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const e = part.trim().toLowerCase();
    if (!e) continue;
    if (EMAIL_RE.test(e)) {
      if (!emails.includes(e)) emails.push(e);
    } else invalid.push(part.trim());
  }
  return { emails, invalid };
}

/**
 * Settings → Notifications: who receives the automatic emails sent while a
 * brand price list is trained (started / completed / failed), and which of
 * those events send one.
 */
export default function NotificationsSection() {
  const { can } = useAuth();
  const canEdit = can('settings.edit');

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [recipients, setRecipients] = useState('');
  const [notifyStarter, setNotifyStarter] = useState(true);
  const [onStarted, setOnStarted] = useState(true);
  const [onCompleted, setOnCompleted] = useState(true);
  const [onFailed, setOnFailed] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testErr, setTestErr] = useState('');

  const apply = (s: NotificationSettings) => {
    setSettings(s);
    setEnabled(s.trainingEnabled);
    setRecipients(s.trainingRecipients.join('\n'));
    setNotifyStarter(s.trainingNotifyStarter);
    setOnStarted(s.trainingOnStarted);
    setOnCompleted(s.trainingOnCompleted);
    setOnFailed(s.trainingOnFailed);
  };

  useEffect(() => {
    setLoading(true);
    getNotificationSettings()
      .then(apply)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load notification settings')))
      .finally(() => setLoading(false));
  }, []);

  const parsed = parseRecipients(recipients);
  const nobody = enabled && !notifyStarter && parsed.emails.length === 0;

  const save = async () => {
    setError('');
    setSaved(false);
    if (parsed.invalid.length) {
      setError(`Not a valid email address: ${parsed.invalid.join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateNotificationSettings({
        trainingEnabled: enabled,
        trainingRecipients: parsed.emails,
        trainingNotifyStarter: notifyStarter,
        trainingOnStarted: onStarted,
        trainingOnCompleted: onCompleted,
        trainingOnFailed: onFailed,
      });
      apply(updated);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save notification settings'));
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestMsg('');
    setTestErr('');
    try {
      const res = await sendTrainingSampleEmail();
      if (res.sent) setTestMsg(`Sample "Training completed" email sent to ${res.to.join(', ')}.`);
      else setTestErr(res.error ?? 'Could not send the sample email');
    } catch (err) {
      setTestErr(apiErrorMessage(err, 'Could not send the sample email'));
    } finally {
      setTesting(false);
    }
  };

  const Toggle = ({
    checked,
    onChange,
    label,
    hint,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
  }) => (
    <label className="flex items-start gap-3 text-sm text-slate-700">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300"
        checked={checked}
        disabled={!canEdit}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-brand-500" />
          Notifications
        </h1>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={() => void save()} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {error && <div className="mb-5 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {saved && (
        <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          Notification settings saved.
        </div>
      )}
      {!canEdit && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have read-only access to notification settings.
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
              title="Training emails"
              action={
                <span className={enabled ? 'badge-green' : 'badge-gray'}>{enabled ? 'On' : 'Off'}</span>
              }
            />
            <CardBody className="space-y-5">
              <p className="text-sm text-slate-500">
                When a brand price list is trained, an email goes out as it starts, when it completes and if
                anything fails. Emails use the sender from Email (SMTP) and the design from Email Template.
              </p>
              <Toggle checked={enabled} onChange={setEnabled} label="Send training emails" />

              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="trainingRecipients">
                    Recipients
                  </label>
                  <textarea
                    id="trainingRecipients"
                    className="input min-h-[110px] font-mono text-sm"
                    placeholder={'one address per line\nops@example.com\nmanager@example.com'}
                    value={recipients}
                    disabled={!canEdit || !enabled}
                    onChange={(e) => setRecipients(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {parsed.emails.length
                      ? `${parsed.emails.length} address${parsed.emails.length === 1 ? '' : 'es'}.`
                      : 'No fixed recipients.'}{' '}
                    {parsed.invalid.length > 0 && (
                      <span className="text-red-600">Not valid: {parsed.invalid.join(', ')}</span>
                    )}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Toggle
                    checked={notifyStarter}
                    onChange={setNotifyStarter}
                    label="Also email the user who clicked Train"
                    hint="If that user is not known (for example after a server restart), the user who uploaded the file."
                  />
                </div>
              </div>

              {nobody && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Nobody would receive these emails: add a recipient or tick the option above.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Which events" />
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <Toggle checked={onStarted} onChange={setOnStarted} label="Training started" hint="As soon as Train is clicked." />
              <Toggle
                checked={onCompleted}
                onChange={setOnCompleted}
                label="Training completed"
                hint="With pages, text size and the page-search index."
              />
              <Toggle
                checked={onFailed}
                onChange={setOnFailed}
                label="Training failed"
                hint="With the reason. Also the warning when only the page-search index failed."
              />
            </CardBody>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader title="Send a sample" />
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-500">
                  Sends a sample "Training completed" email to the saved recipients and to you. Save your
                  changes first — the sample uses the last saved list.
                </p>
                {testErr && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{testErr}</div>}
                {testMsg && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{testMsg}</div>
                )}
                <button type="button" className="btn-primary" onClick={() => void runTest()} disabled={testing}>
                  <SendIcon className="h-4 w-4" />
                  {testing ? 'Sending…' : 'Send sample'}
                </button>
                {settings?.updatedAt && (
                  <p className="text-xs text-slate-400">Last saved {new Date(settings.updatedAt).toLocaleString()}.</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
