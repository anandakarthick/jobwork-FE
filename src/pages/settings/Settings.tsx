import { useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronRightIcon, IdIcon, KeyIcon, MailIcon, SlidersIcon } from '../../components/icons';
import ProfileSection from './ProfileSection';
import GeneralSettingsSection from './GeneralSettingsSection';
import ApiKeysSection from './ApiKeysSection';
import SmtpSection from './SmtpSection';
import LetterPadSection from './LetterPadSection';
import PromptSection from './PromptSection';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
type SectionKey = 'profile' | 'general' | 'smtp' | 'letterpad' | 'prompt' | 'apikeys';

export default function Settings() {
  const { can } = useAuth();
  const [active, setActive] = useState<SectionKey>('profile');

  const menu: { key: SectionKey; label: string; icon: IconType; show: boolean }[] = [
    { key: 'profile', label: 'Profile Settings', icon: IdIcon, show: true },
    { key: 'general', label: 'General Settings', icon: SlidersIcon, show: can('settings.view') },
    { key: 'smtp', label: 'Email (SMTP)', icon: MailIcon, show: can('settings.view') },
    { key: 'letterpad', label: 'Email Template', icon: MailIcon, show: can('settings.view') },
    { key: 'prompt', label: 'Configure Prompt', icon: SlidersIcon, show: can('settings.view') },
    { key: 'apikeys', label: 'API Keys', icon: KeyIcon, show: can('apikeys.view') },
  ];
  const visible = menu.filter((m) => m.show);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Settings menu */}
      <aside className="w-full shrink-0 lg:w-64">
        <div className="card p-3">
          <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Settings Menu
          </p>
          <ul className="space-y-1">
            {visible.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRightIcon className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {active === 'apikeys' && can('apikeys.view') ? (
          <ApiKeysSection />
        ) : active === 'smtp' && can('settings.view') ? (
          <SmtpSection />
        ) : active === 'letterpad' && can('settings.view') ? (
          <LetterPadSection />
        ) : active === 'prompt' && can('settings.view') ? (
          <PromptSection />
        ) : active === 'general' && can('settings.view') ? (
          <GeneralSettingsSection />
        ) : (
          <ProfileSection />
        )}
      </div>
    </div>
  );
}
