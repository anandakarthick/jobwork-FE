import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import IngestWatcher from './IngestWatcher';
import ToastHost from './ToastHost';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* App-level background-ingest watcher + notifications (persist across pages). */}
      <IngestWatcher />
      <ToastHost />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content column is offset by the fixed sidebar width on desktop. */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
