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

// Multi-timeframe calibrated historical trajectory
const TIMEFRAME_DATA = {
  '1W': [
    { date: 'Oct 17', portfolio: 531000, benchmark: 506000 },
    { date: 'Oct 18', portfolio: 534200, benchmark: 507500 },
    { date: 'Oct 19', portfolio: 528000, benchmark: 508000 },
    { date: 'Oct 20', portfolio: 533500, benchmark: 509200 },
    { date: 'Oct 21', portfolio: 539000, benchmark: 512000 },
    { date: 'Oct 22', portfolio: 542400, benchmark: 513800 },
    { date: 'Oct 23', portfolio: 546850, benchmark: 515000 },
  ],
  '1M': [
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
  ],
  '3M': [
    { date: 'Aug 01', portfolio: 432000, benchmark: 440000 },
    { date: 'Aug 15', portfolio: 449000, benchmark: 451000 },
    { date: 'Sep 01', portfolio: 468000, benchmark: 462000 },
    { date: 'Sep 15', portfolio: 482000, benchmark: 475000 },
    { date: 'Oct 01', portfolio: 485000, benchmark: 480000 },
    { date: 'Oct 15', portfolio: 519000, benchmark: 499000 },
    { date: 'Oct 23', portfolio: 546850, benchmark: 515000 },
  ],
  'YTD': [
    { date: 'Jan 01', portfolio: 380000, benchmark: 410000 },
    { date: 'Mar 01', portfolio: 405000, benchmark: 425000 },
    { date: 'May 01', portfolio: 422000, benchmark: 438000 },
    { date: 'Jul 01', portfolio: 445000, benchmark: 455000 },
    { date: 'Sep 01', portfolio: 478000, benchmark: 470000 },
    { date: 'Oct 23', portfolio: 546850, benchmark: 515000 },
  ],
  '1Y': [
    { date: 'Nov 25', portfolio: 350000, benchmark: 390000 },
    { date: 'Jan 26', portfolio: 380000, benchmark: 410000 },
    { date: 'Mar 26', portfolio: 405000, benchmark: 425000 },
    { date: 'Jun 26', portfolio: 438000, benchmark: 448000 },
    { date: 'Aug 26', portfolio: 460000, benchmark: 465000 },
    { date: 'Oct 26', portfolio: 546850, benchmark: 515000 },
  ],
  'ALL': [
    { date: 'Q1 2025', portfolio: 320000, benchmark: 360000 },
    { date: 'Q3 2025', portfolio: 375000, benchmark: 400000 },
    { date: 'Q1 2026', portfolio: 410000, benchmark: 430000 },
    { date: 'Q3 2026', portfolio: 485000, benchmark: 480000 },
    { date: 'Oct 2026', portfolio: 546850, benchmark: 515000 },
  ],
};

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

  const chartData = TIMEFRAME_DATA[activeRange] || TIMEFRAME_DATA['1M'];

  // Calculate dynamic Alpha vs Nifty 50 for the selected timeframe
  const firstPoint = chartData[0];
  const lastPoint = chartData[chartData.length - 1];
  const portfolioReturn = (lastPoint.portfolio - firstPoint.portfolio) / firstPoint.portfolio;
  const benchmarkReturn = (lastPoint.benchmark - firstPoint.benchmark) / firstPoint.benchmark;
  const alphaPercent = ((portfolioReturn - benchmarkReturn) * 100).toFixed(2);
  const isAlphaPositive = Number(alphaPercent) >= 0;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white tracking-tight">Portfolio Performance Curve</h2>
          <p className="text-xs text-slate-400">Total net valuation trajectory vs Nifty 50 benchmark index</p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setActiveRange(range)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all shrink-0 ${
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

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={45}
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60 mt-2 gap-2">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-2">
            <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block"></span>
            WealthOS Portfolio
          </span>
          <span className="flex items-center gap-2 text-slate-400">
            <span className="w-3 h-1 bg-slate-500 rounded-full inline-block"></span>
            Nifty 50 Index
          </span>
        </div>
        <span className={`font-mono text-[11px] font-semibold self-start sm:self-auto ${isAlphaPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isAlphaPositive ? '+' : ''}{alphaPercent}% Alpha vs Nifty 50 ({activeRange})
        </span>
      </div>
    </div>
  );
};
