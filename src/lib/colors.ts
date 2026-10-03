/**
 * Small colour helpers for the UI: a deterministic accent per name (so the same
 * brand or customer always gets the same colour) and the gradient classes used
 * for coloured tiles and avatars.
 */

export type Accent = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'orange' | 'teal';

const ACCENTS: Accent[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange', 'teal'];

/** Gradient tile classes per accent (white text on top). */
export const TILE: Record<Accent, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
  emerald: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white',
  amber: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  rose: 'bg-gradient-to-br from-rose-400 to-pink-600 text-white',
  cyan: 'bg-gradient-to-br from-cyan-400 to-sky-600 text-white',
  orange: 'bg-gradient-to-br from-orange-400 to-red-500 text-white',
  teal: 'bg-gradient-to-br from-teal-400 to-emerald-600 text-white',
};

/** Soft tinted surface per accent (for cards and chips). */
export const SOFT: Record<Accent, string> = {
  blue: 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 ring-blue-100',
  violet: 'bg-gradient-to-br from-violet-50 to-purple-50 text-violet-700 ring-violet-100',
  emerald: 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 ring-amber-100',
  rose: 'bg-gradient-to-br from-rose-50 to-pink-50 text-rose-700 ring-rose-100',
  cyan: 'bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-700 ring-cyan-100',
  orange: 'bg-gradient-to-br from-orange-50 to-red-50 text-orange-700 ring-orange-100',
  teal: 'bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-700 ring-teal-100',
};

/** The same name always maps to the same accent. */
export function accentFor(name: string): Accent {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length]!;
}

/** Up to two initials of a name, e.g. "Acme Industries" → "AI". */
export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}
