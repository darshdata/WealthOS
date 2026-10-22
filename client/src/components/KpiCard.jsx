import React from 'react';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

export const KpiCard = ({ title, value, change, isPositive, subtext, icon: Icon }) => {
  return (
    <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon ? (
          <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-300">
            <Icon className="w-4 h-4" />
          </div>
        ) : (
          <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <h3 className="text-2xl font-bold tracking-tight text-white font-mono">{value}</h3>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/50">
        {change && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
            {change}
          </span>
        )}
        <span className="text-xs text-slate-400 font-medium truncate">{subtext}</span>
      </div>
    </div>
  );
};
