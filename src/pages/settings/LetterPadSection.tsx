import { useEffect, useMemo, useState } from 'react';
import {
  getLetterhead,
  getLetterheadPresets,
  updateLetterhead,
  type Letterhead,
  type LetterheadPreset,
} from '../../api/settings';
import { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAppSelector } from '../../store/hooks';
import { Card, CardBody } from '../../components/ui/Card';
import { CheckCircleIcon, EyeIcon, MailIcon } from '../../components/icons';

type PreviewKind = 'credentials' | 'quote';

export default function LetterPadSection() {
  const { can } = useAuth();
  const canEdit = can('settings.edit');
  const appName = useAppSelector((s) => s.appSettings.appName);
  const logo = useAppSelector((s) => s.appSettings.logo);

  const [data, setData] = useState<Letterhead | null>(null);
  const [presets, setPresets] = useState<LetterheadPreset[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [kind, setKind] = useState<PreviewKind>('credentials');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getLetterhead(), getLetterheadPresets()])
      .then(([lh, ps]) => {
        setData(lh);
        setPresets(ps);
        const active = ps.find((p) => p.html === lh.html)?.key ?? ps[0]?.key ?? null;
        setSelectedKey(active);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the email template')))
      .finally(() => setLoading(false));
  }, []);

  const activeKey = presets.find((p) => p.html === data?.html)?.key ?? null;
  const selected = presets.find((p) => p.key === selectedKey) ?? null;

  // Dummy body content for the preview, per context.
  const sampleContent = useMemo(() => {
    const company = appName || 'Your Company';
    if (kind === 'credentials') {
      const cell = 'padding:8px 16px;background:#f8fafc;color:#6b7280;';
      return (
        `<p style="margin:0 0 14px 0;">Hello Kenneth Rosen,</p>` +
        `<p style="margin:0 0 14px 0;">An account has been created for you on <strong>${company}</strong>. Use the details below to sign in.</p>` +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">` +
        `<tr><td style="${cell}">Login</td><td style="padding:8px 16px;"><a href="#" style="color:#2563eb;">app.example.com/login</a></td></tr>` +
        `<tr><td style="${cell}">Email</td><td style="padding:8px 16px;font-weight:bold;">kenneth@example.com</td></tr>` +
        `<tr><td style="${cell}">Password</td><td style="padding:8px 16px;font-weight:bold;font-family:monospace;">Xy7#kP2m</td></tr>` +
        `<tr><td style="${cell}">Role</td><td style="padding:8px 16px;">Sales Manager</td></tr>` +
        `</table>` +
        `<p style="margin:0;color:#b45309;font-size:13px;">For your security, please sign in and change your password as soon as possible.</p>`
      );
    }
    return (
      `<p style="margin:0 0 14px 0;">Dear Sun Power Solutions,</p>` +
      `<p style="margin:0 0 14px 0;">Thank you for your enquiry. Please find attached our quotation ` +
      `<strong>Q-000015</strong> for MCCB (LK). The total value is <strong>₹10,57,110</strong> for 27 line item(s).</p>` +
      `<p style="margin:0 0 14px 0;">Please let us know if you have any questions or require changes.</p>` +
      `<p style="margin:0;">Best regards,<br>${company}</p>`
    );
  }, [kind, appName]);

  // Fill a design's slots (content / logo / branding) for the live preview.
  const fillSlots = (raw: string): string => {
    const company = appName || 'Your Company';
    const today = new Date();
    const date = `${String(today.getDate()).padStart(2, '0')}.${String(
      today.getMonth() + 1,
    ).padStart(2, '0')}.${today.getFullYear()}`;
    const logoHtml = logo
      ? `<img src="${logo}" alt="${company}" style="max-height:48px;max-width:170px;display:inline-block;border-radius:6px;">`
      : '';
    const title = kind === 'credentials' ? `Welcome to ${company}` : 'Quotation';
    return raw
      .replace(/\{\{\s*content\s*\}\}/gi, sampleContent)
      .replace(/\{\{\s*logo\s*\}\}/gi, logoHtml)
      .replace(/\{\{\s*(title|quote_title)\s*\}\}/gi, title)
      .replace(/\{\{\s*(company_name|company|app_name)\s*\}\}/gi, company)
      .replace(/\{\{\s*date\s*\}\}/gi, date);
  };

  const useThisTemplate = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updateLetterhead({ html: selected.html, enabled: true });
      setData(updated);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not apply this template'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <MailIcon className="h-5 w-5 text-brand-500" />
        <h1 className="!mb-0">Email Template</h1>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        Choose the email template used for outgoing emails — new-user credentials and quotes sent to
        customers. Your company name and logo (Settings → General) are filled in automatically.
      </p>

      {error && <div className="mb-5 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {saved && (
        <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          Template applied — it will be used for all outgoing emails.
        </div>
      )}
      {!canEdit && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have read-only access to the email template.
        </div>
      )}

      {loading ? (
        <Card>
          <CardBody className="py-16 text-center text-slate-400">Loading…</CardBody>
        </Card>
      ) : (
        <>
          {/* Theme cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {presets.map((p) => {
              const isSelected = selectedKey === p.key;
              const isActive = activeKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(p.key);
                    setSaved(false);
                  }}
                  className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${
                    isSelected
                      ? 'border-brand-500 ring-2 ring-brand-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Colored swatch with a mini email mockup */}
                  <div className="relative p-4" style={{ background: p.color }}>
                    {isActive && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow">
                        <CheckCircleIcon className="h-4 w-4" />
                      </span>
                    )}
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="mb-1.5 h-2 w-3/4 rounded bg-slate-200" />
                      <div className="mb-3 h-2 w-1/2 rounded bg-slate-200" />
                      <div className="h-4 w-20 rounded bg-indigo-400/80" />
                    </div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="mt-1 text-xs leading-snug text-slate-400">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <EyeIcon className="h-4 w-4 text-slate-500" />
              Template Preview
            </h3>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {([
                ['credentials', 'New user email'],
                ['quote', 'Quote to customer'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    kind === k ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden">
            <iframe
              title="Template preview"
              className="h-[560px] w-full bg-white"
              sandbox=""
              srcDoc={selected ? fillSlots(selected.html) : ''}
            />
          </Card>

          {/* Use this template */}
          {canEdit && selected && (
            <div className="mt-4 flex justify-center">
              {activeKey === selected.key ? (
                <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  “{selected.name}” is currently in use
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void useThisTemplate()}
                  disabled={saving}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {saving ? 'Applying…' : `Use “${selected.name}” template`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
