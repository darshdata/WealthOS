import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePortfolio } from '../context/usePortfolio';
import { formatINR } from '../utils/currency';

const SECTOR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b', // slate (cash)
];

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-semibold text-white">{data.name}</p>
        <p className="text-emerald-400 font-mono font-medium">
          {formatINR(data.value)} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export const AllocationChart = () => {
  const { portfolioSummary } = usePortfolio();

  const allocationData = useMemo(() => {
    const holdings = portfolioSummary?.holdings || [];
    const sectorMap = {};

    holdings.forEach((h) => {
      const sector = h.sector || 'Other';
      sectorMap[sector] = (sectorMap[sector] || 0) + (h.currentRupees || 0);
    });

    // Add cash reserve
    const cashVal = portfolioSummary?.cashBalanceRupees || 0;
    if (cashVal > 0) {
      sectorMap['Cash Reserve'] = (sectorMap['Cash Reserve'] || 0) + cashVal;
    }

    const totalVal = portfolioSummary?.totalPortfolioValueRupees || 1;

    return Object.entries(sectorMap).map(([name, val], idx) => {
      const percentage = Number(((val / totalVal) * 100).toFixed(1));
      return {
        name,
        value: Math.round(val),
        percentage,
        color: SECTOR_COLORS[idx % SECTOR_COLORS.length],
      };
    });
  }, [portfolioSummary]);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between min-w-0">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight">Asset Allocation</h2>
        <p className="text-xs text-slate-400">Class &amp; sector breakdown by market exposure</p>
      </div>

      <div className="w-full h-52 relative my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomPieTooltip />} />
            <Pie
              data={allocationData}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {allocationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Centered label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Net Value</span>
          <span className="text-xs font-bold text-white font-mono text-center px-1 truncate max-w-[100px]">
            {portfolioSummary.formattedTotalPortfolioValue}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-800/60 pt-3 max-h-48 overflow-y-auto">
        {allocationData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
              <span className="text-slate-300 font-medium truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 font-mono">
                {formatINR(item.value)}
              </span>
              <span className="font-semibold text-slate-200 font-mono w-10 text-right">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
