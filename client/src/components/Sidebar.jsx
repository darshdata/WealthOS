import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  PieChart,
  Settings,
  ShieldCheck,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../services/api.js';

export const Sidebar = ({ isOpen = false, onClose }) => {
  const [backendStatus, setBackendStatus] = useState({
    loading: false,
    online: true,
    dbOnline: true,
    data: null,
  });

  // Handle ESC key press to close mobile drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Lock body scroll when mobile menu is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    let isMounted = true;

    const checkApi = async () => {
      try {
        const [apiRes, dbRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/health`),
          fetch(`${API_BASE_URL}/health/database`),
        ]);

        const isApiOk = apiRes.status === 'fulfilled' && apiRes.value.ok;
        let isDbOk = false;

        if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
          try {
            const dbData = await dbRes.value.json();
            isDbOk = dbData.database === 'connected' || dbData.status === 'ok';
          } catch {
            isDbOk = false;
          }
        }

        if (isMounted) {
          setBackendStatus({
            loading: false,
            online: isApiOk,
            dbOnline: isDbOk,
            data: null,
          });
        }
      } catch {
        if (isMounted) {
          setBackendStatus({ loading: false, online: false, dbOnline: false, data: null });
        }
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Holdings', path: '/holdings', icon: PieChart },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const renderContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-lg">WealthOS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v0.1</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Portfolio Intelligence</p>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <p className="px-3 text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Core Platform</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => {
                if (isMobile) onClose?.();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System & Database Status Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" /> Trading Engine
            </span>
            <span
              className={`flex items-center gap-1 font-semibold text-[11px] ${
                backendStatus.online ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {backendStatus.online ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Online
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" /> Offline
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" /> Cloud Database
            </span>
            <span
              className={`flex items-center gap-1 font-semibold text-[11px] ${
                backendStatus.dbOnline ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {backendStatus.dbOnline ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" /> Disconnected
                </>
              )}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="mt-3 flex items-center gap-3 px-2 pt-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
            DM
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Darsh Mehta</p>
            <p className="text-[10px] text-slate-400 truncate">Portfolio Manager • Institutional</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900/90 border-r border-slate-800 flex-col shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {renderContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <aside
            className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-50 h-full overflow-y-auto animate-in slide-in-from-left duration-200"
            aria-label="Mobile Navigation"
          >
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

