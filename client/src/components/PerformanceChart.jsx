import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatINR } from '../utils/currency';

// Historical trajectory calibrated in INR
const MOCK_INR_PERFORMANCE_HISTORY = [
  { date: 'Oct 01', portfolio: 485000, benchmark: 480000 },
  { date: 'Oct 03', portfolio: 492000, benchmark: 484000 },
  { date: 'Oct 05', portfolio: 488000, benchmark: 482000 },
  { date: 'Oct 07', portfolio: 501000, benchmark: 489000 },
  { date: 'Oct 09', portfolio: 512000, benchmark: 495000 },
  { date: 'Oct 11', portfolio: 509000, benchmark: 494000 },
  { date: 'Oct 13', portfolio: 524000, benchmark: 501000 },
  { date: 'Oct 15', portfolio: 519000, benchmark: 499000 },
  { date: 'Oct 17', portfolio: 531000, benchmark: 506000 },
  { date: 'Oct 19', portfolio: 528000, benchmark: 508000 },
  { date: 'Oct 21', portfolio: 539000, benchmark: 512000 },
  { date: 'Oct 23', portfolio: 546850, benchmark: 515000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-300">{label}</p>
        <p className="text-emerald-400 font-mono font-medium">
          WealthOS: {formatINR(payload[0].value)}
        </p>
        {payload[1] && (
          <p className="text-slate-400 font-mono">
            Nifty 50: {formatINR(payload[1].value)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const PerformanceChart = () => {
  const [activeRange, setActiveRange] = useState('1M');
  const ranges = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

  return (
    <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Portfolio Performance Curve</h2>
          <p className="text-xs text-slate-400">Total net valuation trajectory vs Nifty 50 benchmark index</p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeRange === range
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_INR_PERFORMANCE_HISTORY} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              domain={['dataMin - 15000', 'dataMax + 15000']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#portfolioGradient)"
            />
            <Area
              type="monotone"
              dataKey="benchmark"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60 mt-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block"></span>
            WealthOS Portfolio
          </span>
          <span className="flex items-center gap-2 text-slate-400">
            <span className="w-3 h-1 bg-slate-500 rounded-full inline-block"></span>
            Nifty 50 Index
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-400/90 font-medium">+6.18% Alpha vs Nifty 50</span>
      </div>
    </div>
  );
};
