import { NavLink } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandMark, useAppName } from './ui/Brand';
import { TILE, type Accent } from '../lib/colors';
import {
  BuildingIcon,
  ChevronRightIcon,
  ContactIcon,
  DashboardIcon,
  SettingsIcon,
  SlidersIcon,
  SparklesIcon,
  UsersIcon,
} from './icons';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  /** Colour of the item's icon tile. */
  accent: Accent;
  end?: boolean;
  /** Permission required to see this item (omit = always visible). */
  permission?: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    heading: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: DashboardIcon, accent: 'blue', end: true, permission: 'dashboard.view' },
      { to: '/customers', label: 'Customers', icon: ContactIcon, accent: 'emerald', permission: 'customers.view' },
      { to: '/companies', label: 'Brands', icon: BuildingIcon, accent: 'violet', permission: 'companies.view' },
      { to: '/jobwork', label: 'Get Quote', icon: SparklesIcon, accent: 'amber', permission: 'jobwork.view' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/roles', label: 'Roles', icon: SettingsIcon, accent: 'rose', permission: 'roles.view' },
      { to: '/users', label: 'Users', icon: UsersIcon, accent: 'cyan', permission: 'users.view' },
    ],
  },
];

/**
 * One menu entry: a coloured icon tile + label; the active one becomes a brand
 * gradient bar. When the rail is collapsed only the tile shows (the label moves
 * to a tooltip).
 */
function NavEntry({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-all ${
          collapsed ? 'justify-center px-0 lg:px-0' : 'px-3'
        } ${
          isActive
            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
            : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg shadow-sm transition-transform group-hover:scale-110 ${
              isActive ? 'bg-white/20 text-white' : TILE[item.accent]
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

interface SidebarProps {
  /** Small screens: the drawer is open. */
  open: boolean;
  onClose: () => void;
  /** Large screens: icons-only rail. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const { can, user } = useAuth();
  const appName = useAppName();

  // Hide items the user has no permission for, then drop empty sections.
  const visibleSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.permission || can(i.permission)),
    }))
    .filter((s) => s.items.length > 0);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar bg-gradient-to-b from-slate-900 via-slate-900 to-[#0b1220] text-slate-300 shadow-pop transition-all duration-200 lg:inset-y-3 lg:left-3 lg:translate-x-0 lg:rounded-2xl lg:ring-1 lg:ring-white/10 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        {/* Soft coloured glow at the top of the rail. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden rounded-t-2xl bg-gradient-to-b from-brand-500/25 to-transparent"
        />

        {/* Collapse / expand (desktop only) — a small round tab on the rail's edge. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute -right-3 top-[4.5rem] z-10 hidden h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-pop transition hover:text-brand-600 lg:grid"
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* Brand */}
        <div
          className={`relative flex h-16 items-center gap-2.5 border-b border-sidebar-border ${
            collapsed ? 'justify-center px-0' : 'px-6'
          }`}
        >
          <BrandMark className="h-9 w-9 text-sm shadow-glow" />
          <span className={`text-lg font-semibold tracking-tight text-white ${collapsed ? 'lg:hidden' : ''}`}>
            {appName}
          </span>
        </div>

        {/* Navigation */}
        <nav className={`relative flex-1 space-y-6 overflow-y-auto py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {visibleSections.map((section) => (
            <div key={section.heading}>
              <p
                className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                  collapsed ? 'lg:hidden' : ''
                }`}
              >
                {section.heading}
              </p>
              {collapsed && <div className="mx-3 mb-2 hidden border-t border-sidebar-border lg:block" />}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavEntry item={item} collapsed={collapsed} onClick={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Settings — available to every signed-in user (their profile lives here) */}
        <div className={`border-t border-sidebar-border py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          <NavEntry
            item={{ to: '/settings', label: 'Settings', icon: SlidersIcon, accent: 'teal' }}
            collapsed={collapsed}
            onClick={onClose}
          />
        </div>

        {/* Signed-in user */}
        <div
          className={`flex items-center gap-3 border-t border-sidebar-border py-4 ${
            collapsed ? 'justify-center px-0' : 'px-5'
          }`}
          title={collapsed ? `${user?.name ?? ''} · ${user?.role?.name ?? ''}` : undefined}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white shadow-glow">
            {initials}
          </span>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.role?.name ?? '—'}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
