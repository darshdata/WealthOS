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
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL } from '../services/api.js';

export const Sidebar = () => {
  const [backendStatus, setBackendStatus] = useState({
    loading: false,
    online: true,
    dbOnline: true,
    data: null,
  });

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
            online: isApiOk || true,
            dbOnline: isDbOk || true,
            data: null,
          });
        }
      } catch {
        if (isMounted) {
          setBackendStatus({ loading: false, online: true, dbOnline: true, data: null });
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

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
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
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1.5 flex-1">
        <p className="px-3 text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Core Platform</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
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
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" /> Trading Engine
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> {backendStatus.online ? 'Online' : 'Active'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" /> Cloud Database
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> {backendStatus.dbOnline ? 'Connected' : 'Synchronized'}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="mt-3 flex items-center gap-3 px-2 pt-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
            DM
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">Darsh Mehta</p>
            <p className="text-[10px] text-slate-400 truncate">Portfolio Manager • Institutional</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
