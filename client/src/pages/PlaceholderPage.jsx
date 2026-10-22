import React from 'react';
import { Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PlaceholderPage = ({ title, description }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
        <Construction className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      <p className="text-sm text-slate-400 max-w-md mt-2">
        {description}
      </p>
      <div className="mt-4 px-3 py-1 rounded-md bg-slate-800/80 text-[11px] font-mono text-slate-400 border border-slate-700">
        Enterprise Module Configuration • Live Platform
      </div>
      <Link
        to="/"
        className="mt-6 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors"
      >
        Return to Dashboard Overview
      </Link>
    </div>
  );
};
