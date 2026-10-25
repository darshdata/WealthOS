import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const DashboardLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 overflow-x-hidden">
      {/* Sidebar (Desktop persistent + Mobile slide-over drawer) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

