import React from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Banknote,
  Sparkles,
  Zap,
} from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { PerformanceChart } from '../components/PerformanceChart';
import { AllocationChart } from '../components/AllocationChart';
import { AssetsTable } from '../components/AssetsTable';
import { usePortfolio } from '../context/usePortfolio';

export const DashboardPage = () => {
  const { portfolioSummary } = usePortfolio();

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* Welcome & Valuation Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800/80 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                Enterprise Portfolio Core • Live Production
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                High-Precision Currency Engine: Subunit Paise (Scale 100)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Portfolio Overview &amp; Live Feed Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Enterprise portfolio intelligence and risk management platform. Real-time streaming tick execution, sub-cent precision mathematical ledger, and institutional asset allocation.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left sm:text-right">
              <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold">Total Portfolio Net Worth</p>
              <p className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                {portfolioSummary.formattedTotalPortfolioValue}
              </p>
            </div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Row with Live Computed Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Total Net Worth"
          value={portfolioSummary.formattedTotalPortfolioValue}
          change={portfolioSummary.formattedDayChangePercent}
          isPositive={portfolioSummary.isDayPositive}
          subtext={`${portfolioSummary.formattedDayChange} 24h change`}
          icon={Wallet}
        />
        <KpiCard
          title="Invested Principal"
          value={portfolioSummary.formattedTotalInvested}
          subtext={`Cost basis across ${portfolioSummary.holdings.length} positions`}
          icon={DollarSign}
        />
        <KpiCard
          title="Unrealized Gain / P&L"
          value={portfolioSummary.formattedUnrealizedPnL}
          change={portfolioSummary.formattedUnrealizedPnLPercent}
          isPositive={portfolioSummary.isPnLPositive}
          subtext="Net return on invested capital"
          icon={TrendingUp}
        />
        <KpiCard
          title="Available Cash"
          value={portfolioSummary.formattedCashBalance}
          subtext="Instant deployable liquidity"
          icon={Banknote}
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 min-w-0">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1 min-w-0">
          <AllocationChart />
        </div>
      </div>

      {/* Holdings & System Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 min-w-0">
          <AssetsTable />
        </div>
        <div className="lg:col-span-1 p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between min-w-0">

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">System Architecture &amp; Controls</h2>
            </div>
            <p className="text-xs text-slate-400">
              Institutional-grade financial infrastructure with automated audit controls and risk safeguards.
            </p>

            <ul className="mt-4 space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Subunit Currency Math (Paise)</span>
                  <p className="text-slate-400 text-[11px]">All values stored with SCALE = 100 to eliminate IEEE 754 precision drift.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Streaming Market Ticks</span>
                  <p className="text-slate-400 text-[11px]">Sub-second exchange quote simulation batched via requestAnimationFrame buffer.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Cancellable Instrument Search</span>
                  <p className="text-slate-400 text-[11px]">Debounced search engine with AbortController query cancellation.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Atomic Order Execution Ledger</span>
                  <p className="text-slate-400 text-[11px]">ACID ledger with idempotency safeguards supporting real-time BUY &amp; SELL.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500 font-mono">
            WealthOS Enterprise • High-Performance Trading Core
          </div>
        </div>
      </div>
    </div>
  );
};
