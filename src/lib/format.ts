import type { GeneralSettings } from '../context/SettingsContext';

/** Formats a date per the app's configured date format (with time). */
export function formatDate(value: string | Date, format: GeneralSettings['dateFormat']): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  const date =
    format === 'MM/DD/YYYY'
      ? `${mm}/${dd}/${yyyy}`
      : format === 'YYYY-MM-DD'
        ? `${yyyy}-${mm}-${dd}`
        : `${dd}/${mm}/${yyyy}`;

  return `${date} ${hh}:${min}`;
}

/** Formats an amount with the app's configured currency symbol (Indian grouping). */
export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
