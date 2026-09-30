import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface GeneralSettings {
  pageSize: number;
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

export interface AppSettings {
  general: GeneralSettings;
}

const STORAGE_KEY = 'jobwork.settings';

const DEFAULTS: AppSettings = {
  general: {
    pageSize: 10,
    currency: '₹',
    dateFormat: 'DD/MM/YYYY',
  },
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { general: { ...DEFAULTS.general, ...parsed.general } };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  saveGeneral: (patch: Partial<GeneralSettings>) => void;
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);

  const saveGeneral = useCallback(
    (patch: Partial<GeneralSettings>) =>
      setSettings((prev) => {
        const next = { ...prev, general: { ...prev.general, ...patch } };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const reload = useCallback(() => setSettings(load()), []);

  const value = useMemo(
    () => ({ settings, saveGeneral, reload }),
    [settings, saveGeneral, reload],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
