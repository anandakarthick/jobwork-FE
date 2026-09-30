import { useAppSelector } from '../../store/hooks';

/**
 * The app's logo mark — the uploaded logo image, or a colored box with the
 * first letter of the app name as a fallback. Sizing via `className`.
 */
export function BrandMark({ className = 'h-8 w-8 text-sm' }: { className?: string }) {
  const { appName, logo } = useAppSelector((s) => s.appSettings);
  const letter = (appName?.trim()?.[0] ?? 'J').toUpperCase();
  if (logo) {
    return <img src={logo} alt={appName} className={`rounded-lg object-cover ${className}`} />;
  }
  return (
    <span className={`grid place-items-center rounded-lg bg-brand-600 font-bold text-white ${className}`}>
      {letter}
    </span>
  );
}

/** The app name from settings (falls back to "Jobwork"). */
export function useAppName(): string {
  return useAppSelector((s) => s.appSettings.appName) || 'Jobwork';
}
