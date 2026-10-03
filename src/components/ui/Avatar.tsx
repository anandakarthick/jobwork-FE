import { accentFor, initialsOf, TILE } from '../../lib/colors';

/** A coloured initials tile for a brand, customer or user — same name, same colour. */
export default function Avatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass =
    size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs';
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-semibold shadow-sm ${TILE[accentFor(name)]} ${sizeClass} ${className}`}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
