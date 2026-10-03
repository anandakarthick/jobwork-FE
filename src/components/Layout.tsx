import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import IngestWatcher from './IngestWatcher';
import ToastHost from './ToastHost';

const COLLAPSE_KEY = 'jobwork.sidebar';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

/**
 * App shell: a floating sidebar rail on the left (collapsible to icons only on
 * desktop — the choice is remembered per browser), a translucent header, and the
 * page content on a soft, colour-washed canvas (see index.css body background).
 */
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // small screens: drawer
  const [collapsed, setCollapsed] = useState(readCollapsed); // large screens: icon rail

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      /* storage unavailable — the choice just isn't remembered */
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen">
      {/* App-level background-ingest watcher + notifications (persist across pages). */}
      <IngestWatcher />
      <ToastHost />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      {/* Content column is offset by the floating sidebar (width + its margins) on desktop. */}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-[5.5rem]' : 'lg:pl-[17.5rem]'
        }`}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 animate-fade-up px-4 pb-8 pt-2 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
