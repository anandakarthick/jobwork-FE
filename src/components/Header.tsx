import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLlmStatus } from '../store/llmStatusSlice';
import { LockIcon, LogoutIcon, MenuIcon, SlidersIcon, SparklesIcon } from './icons';

interface HeaderProps {
  onMenuClick: () => void;
}

const PROVIDER_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  stub: 'None',
};

const balanceFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
function formatBalance(n: number): string {
  return balanceFmt.format(n);
}
const costFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
function formatCost(n: number): string {
  return costFmt.format(n);
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  // Live LLM status from the store — updated by settings saves and chat/quote spend.
  const llm = useAppSelector((s) => s.llmStatus.status);

  useEffect(() => {
    void dispatch(fetchLlmStatus());
  }, [dispatch]);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm backdrop-blur hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      <div className="ml-auto flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur">
        {/* Active AI provider + model + balance. Not a link — informational only. */}
        {llm && (
          <div
            title={
              llm.provider === 'stub'
                ? 'No AI provider configured — set one in Settings'
                : `${PROVIDER_LABEL[llm.provider]} · ${llm.model ?? ''} · ${
                    llm.keySet ? 'key set' : 'no key'
                  }` +
                  (llm.balance != null
                    ? ` · balance ${llm.balanceCurrency} ${formatBalance(llm.balance)} − spent ${formatCost(
                        llm.spent,
                      )} = ${formatCost(llm.remaining ?? 0)} · ${llm.balanceNote}`
                    : ` · ${llm.balanceNote}`)
            }
            className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ring-inset md:inline-flex ${
              llm.provider === 'stub' || !llm.keySet
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 ring-amber-200'
                : 'bg-gradient-to-r from-brand-50 to-violet-50 text-brand-700 ring-brand-200'
            }`}
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            <span>{PROVIDER_LABEL[llm.provider] ?? llm.provider}</span>
            {llm.model && <span className="hidden text-slate-400 lg:inline">· {llm.model}</span>}
            {llm.provider !== 'stub' && (
              <span className={llm.remaining != null ? 'font-semibold text-emerald-600' : 'text-amber-600'}>
                {llm.remaining != null
                  ? `${llm.balanceCurrency} ${formatBalance(llm.remaining)}`
                  : 'set balance in Settings'}
              </span>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-slate-100"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm ring-2 ring-white">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-slate-800">
                {user?.name}
              </span>
              <span className="block text-xs leading-tight text-slate-400">{user?.role?.name}</span>
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="popover absolute right-0 z-20 mt-2 w-52 py-1.5">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <SlidersIcon className="h-4 w-4" />
                  Profile settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/change-password');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <LockIcon className="h-4 w-4" />
                  Change password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/guide');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
                    <path strokeLinecap="round" d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20M8 7h8M8 10.5h8" />
                  </svg>
                  User guide
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <LogoutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
