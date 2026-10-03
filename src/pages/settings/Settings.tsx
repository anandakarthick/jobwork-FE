import { useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TILE, type Accent } from '../../lib/colors';
import { IdIcon, KeyIcon, MailIcon, SlidersIcon } from '../../components/icons';
import ProfileSection from './ProfileSection';
import GeneralSettingsSection from './GeneralSettingsSection';
import ApiKeysSection from './ApiKeysSection';
import SmtpSection from './SmtpSection';
import LetterPadSection from './LetterPadSection';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
type SectionKey = 'profile' | 'general' | 'smtp' | 'letterpad' | 'apikeys';

interface Tab {
  key: SectionKey;
  label: string;
  hint: string;
  icon: IconType;
  accent: Accent;
  show: boolean;
}

/**
 * Settings: a sub-menu of coloured entries down the left (a row across the top
 * on small screens), the chosen section on the right. Only the entries the user
 * may see appear.
 */
export default function Settings() {
  const { can } = useAuth();
  const [active, setActive] = useState<SectionKey>('profile');

  const tabs: Tab[] = [
    { key: 'profile', label: 'Profile', hint: 'Your name, phone and password', icon: IdIcon, accent: 'blue', show: true },
    { key: 'general', label: 'General', hint: 'App name, logo, theme, formats', icon: SlidersIcon, accent: 'violet', show: can('settings.view') },
    { key: 'smtp', label: 'Email (SMTP)', hint: 'Outgoing mail server', icon: MailIcon, accent: 'emerald', show: can('settings.view') },
    { key: 'letterpad', label: 'Email Template', hint: 'Letterhead for sent emails', icon: MailIcon, accent: 'amber', show: can('settings.view') },
    { key: 'apikeys', label: 'API Keys', hint: 'AI provider and balance', icon: KeyIcon, accent: 'rose', show: can('apikeys.view') },
  ];
  const visible = tabs.filter((t) => t.show);
  const current = visible.find((t) => t.key === active) ?? visible[0]!;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Sub-menu (left on desktop, a scrolling row on small screens) */}
      <aside className="card w-full shrink-0 overflow-x-auto p-2 lg:sticky lg:top-20 lg:w-72">
        <p className="hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">
          Settings
        </p>
        <div className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col" role="tablist" aria-label="Settings sections">
          {visible.map((t) => {
            const Icon = t.icon;
            const isActive = current.key === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.key)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-sm transition-transform group-hover:scale-110 ${
                    isActive ? 'bg-white/20 text-white' : TILE[t.accent]
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{t.label}</span>
                  <span className={`block text-[11px] leading-tight ${isActive ? 'text-white/75' : 'text-slate-400'}`}>
                    {t.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1 animate-fade-up" key={current.key}>
        {current.key === 'apikeys' ? (
          <ApiKeysSection />
        ) : current.key === 'smtp' ? (
          <SmtpSection />
        ) : current.key === 'letterpad' ? (
          <LetterPadSection />
        ) : current.key === 'general' ? (
          <GeneralSettingsSection />
        ) : (
          <ProfileSection />
        )}
      </div>
    </div>
  );
}
