import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from '../../context/SettingsContext';
import type { GeneralSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { updateAppSettings } from '../../api/settings';
import { apiErrorMessage } from '../../lib/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setAppSettings } from '../../store/appSettingsSlice';
import { Card } from '../../components/ui/Card';
import { BrandMark } from '../../components/ui/Brand';
import { THEME_KEYS, THEME_PRESETS, themeSwatch } from '../../lib/theme';
import { BoxIcon, PaperclipIcon, SaveIcon, SlidersIcon, TrashIcon } from '../../components/icons';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

const PAGE_SIZES = [10, 20, 50, 100];
const DATE_FORMATS: GeneralSettings['dateFormat'][] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

function SectionCard({ icon: Icon, title, children }: { icon: typeof SlidersIcon; title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Icon className="h-4 w-4 text-brand-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      </div>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function GeneralSettingsSection() {
  const { settings, saveGeneral } = useSettings();
  const [draft, setDraft] = useState<GeneralSettings>(settings.general);
  const [saved, setSaved] = useState(false);

  // ----- App branding (server-backed, role-gated) -----
  const { can } = useAuth();
  const canEdit = can('settings.edit');
  const dispatch = useAppDispatch();
  const branding = useAppSelector((s) => s.appSettings);
  const [appName, setAppName] = useState(branding.appName);
  const [logo, setLogo] = useState<string | null>(branding.logo);
  const [themeColor, setThemeColor] = useState(branding.themeColor);
  const [brandingBusy, setBrandingBusy] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState('');
  const [brandingErr, setBrandingErr] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBrandingErr('Logo must be an image file.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setBrandingErr('Logo is too large (max 2 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      setBrandingErr('');
      setBrandingMsg('');
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = async () => {
    setBrandingBusy(true);
    setBrandingErr('');
    setBrandingMsg('');
    try {
      const updated = await updateAppSettings({
        appName: appName.trim() || 'Jobwork',
        themeColor,
        ...(logo === branding.logo ? {} : logo ? { logo } : { clearLogo: true }),
      });
      dispatch(setAppSettings(updated)); // reflect in sidebar / title / theme / login instantly
      setAppName(updated.appName);
      setLogo(updated.logo);
      setThemeColor(updated.themeColor);
      setBrandingMsg('Branding saved.');
    } catch (err) {
      setBrandingErr(apiErrorMessage(err, 'Could not save branding'));
    } finally {
      setBrandingBusy(false);
    }
  };

  const set = <K extends keyof GeneralSettings>(key: K, v: GeneralSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  };

  const save = () => {
    saveGeneral(draft);
    setSaved(true);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2">
          <SlidersIcon className="h-5 w-5 text-brand-500" />
          General Settings
        </h1>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={save}>
            <SaveIcon className="h-4 w-4" />
            Save changes
          </button>
        )}
      </div>

      {saved && (
        <div className="mb-5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          Settings saved.
        </div>
      )}
      {!canEdit && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          You have read-only access to settings.
        </div>
      )}

      <div className="space-y-6">
        {/* Branding — project name + logo (role-gated by settings.edit) */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BoxIcon className="h-4 w-4 text-brand-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Branding
              </h3>
            </div>
            {canEdit && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => void saveBranding()}
                disabled={brandingBusy}
              >
                <SaveIcon className="h-4 w-4" />
                {brandingBusy ? 'Saving…' : 'Save branding'}
              </button>
            )}
          </div>

          {brandingErr && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{brandingErr}</div>
          )}
          {brandingMsg && (
            <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {brandingMsg}
            </div>
          )}
          {!canEdit && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              You have read-only access to branding.
            </div>
          )}

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="appName">Project name</label>
              <input
                id="appName"
                className="input"
                maxLength={120}
                value={appName}
                disabled={!canEdit}
                onChange={(e) => setAppName(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Shown in the sidebar, the browser tab title, and the login page.
              </p>
            </div>
            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-3">
                <BrandMark className="h-12 w-12 text-lg" />
                {canEdit && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <PaperclipIcon className="h-4 w-4" />
                      {logo ? 'Change logo' : 'Upload logo'}
                    </button>
                    {logo && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                        onClick={() => {
                          setLogo(null);
                          setBrandingMsg('');
                        }}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Remove logo
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    pickLogo(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                PNG/JPG/SVG up to 2 MB. Falls back to the first letter of the name.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Accent color</label>
              <div className="flex flex-wrap gap-2">
                {THEME_KEYS.map((key) => {
                  const selected = themeColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setThemeColor(key)}
                      title={THEME_PRESETS[key].label}
                      className={`grid h-8 w-8 place-items-center rounded-full ring-2 ring-offset-2 transition ${
                        selected ? 'ring-slate-400' : 'ring-transparent hover:ring-slate-200'
                      } ${canEdit ? '' : 'cursor-not-allowed opacity-60'}`}
                      style={{ backgroundColor: themeSwatch(key) }}
                      aria-label={THEME_PRESETS[key].label}
                    >
                      {selected && <span className="text-xs font-bold text-white">✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Primary color for buttons, links and the active menu — applied everywhere.
              </p>
            </div>
          </div>
        </Card>

        <SectionCard icon={SlidersIcon} title="Pagination">
          <div>
            <label className="label" htmlFor="pageSize">Rows per page</label>
            <select
              id="pageSize"
              className="input"
              value={draft.pageSize}
              disabled={!canEdit}
              onChange={(e) => set('pageSize', Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Default number of rows shown in all list tables (Companies, Categories, Customers).
            </p>
          </div>
        </SectionCard>

        <SectionCard icon={BoxIcon} title="Common">
          <div>
            <label className="label" htmlFor="currency">Currency symbol</label>
            <input
              id="currency"
              className="input"
              maxLength={4}
              value={draft.currency}
              disabled={!canEdit}
              onChange={(e) => set('currency', e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-400">Used when displaying amounts.</p>
          </div>
          <div>
            <label className="label" htmlFor="dateFormat">Date format</label>
            <select
              id="dateFormat"
              className="input"
              value={draft.dateFormat}
              disabled={!canEdit}
              onChange={(e) => set('dateFormat', e.target.value as GeneralSettings['dateFormat'])}
            >
              {DATE_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
