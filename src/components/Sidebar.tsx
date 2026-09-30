import { NavLink } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandMark, useAppName } from './ui/Brand';
import {
  BuildingIcon,
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
      { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true, permission: 'dashboard.view' },
      { to: '/customers', label: 'Customers', icon: ContactIcon, permission: 'customers.view' },
      { to: '/companies', label: 'Brands', icon: BuildingIcon, permission: 'companies.view' },
      { to: '/jobwork', label: 'Get Quote', icon: SparklesIcon, permission: 'jobwork.view' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/roles', label: 'Roles', icon: SettingsIcon, permission: 'roles.view' },
      { to: '/users', label: 'Users', icon: UsersIcon, permission: 'users.view' },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { can } = useAuth();
  const appName = useAppName();

  // Hide items the user has no permission for, then drop empty sections.
  const visibleSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.permission || can(i.permission)),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
          <BrandMark className="h-8 w-8 text-sm" />
          <span className="text-lg font-semibold tracking-tight text-white">{appName}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {visibleSections.map((section) => (
            <div key={section.heading}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.heading}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                          }`
                        }
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Settings — available to every signed-in user (their profile lives here) */}
        <div className="border-t border-sidebar-border px-3 py-3">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <SlidersIcon className="h-5 w-5 shrink-0" />
            Settings
          </NavLink>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-6 py-4 text-xs text-slate-500">
          v0.1.0 · © {appName}
        </div>
      </aside>
    </>
  );
}
