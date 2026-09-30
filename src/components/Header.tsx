import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLlmStatus } from '../store/llmStatusSlice';
import { BellIcon, LogoutIcon, MenuIcon, SearchIcon, SparklesIcon } from './icons';

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-header lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
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
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium md:inline-flex ${
              llm.provider === 'stub' || !llm.keySet
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-brand-200 bg-brand-50 text-brand-700'
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

        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
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
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-card-hover">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
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
