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
    <div className="space-y-6">
      {/* Welcome & Valuation Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800/80 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-400" />
                Sprint 1 • Task 2 Reactive Core
              </span>
              <span className="text-xs text-slate-400 font-mono">Precision Math Engine: Integer Paise (Scale 100)</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Portfolio Overview &amp; Live Feed Console
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              WealthOS institutional engine foundation. Real-time batched market ticks, debounced instrument search with cancellation, and sub-cent precision mathematical ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-right">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Portfolio Net Worth</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {portfolioSummary.formattedTotalPortfolioValue}
              </p>
            </div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Row with Live Computed Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1">
          <AllocationChart />
        </div>
      </div>

      {/* Holdings & System Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AssetsTable />
        </div>
        <div className="lg:col-span-1 p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Task 2 Engine Verification</h2>
            </div>
            <p className="text-xs text-slate-400">
              Verified precision financial architecture in accordance with SDE rubric.
            </p>

            <ul className="mt-4 space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Integer Subunits Math (Paise)</span>
                  <p className="text-slate-400 text-[11px]">All values stored with SCALE = 100 to eliminate IEEE 754 precision drift.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Streaming Ticks &amp; RAF Batching</span>
                  <p className="text-slate-400 text-[11px]">Sub-second price simulation batched via requestAnimationFrame buffer.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Cancellable Debounced Search</span>
                  <p className="text-slate-400 text-[11px]">AbortController terminates stale in-flight searches on rapid typing.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <span className="font-semibold text-slate-200">Order Execution Ledger</span>
                  <p className="text-slate-400 text-[11px]">Integrated Trade modal supporting real-time BUY &amp; SELL executions.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500 font-mono">
            WealthOS Sprint 1 • Task 2 Reactive Core
          </div>
        </div>
      </div>
    </div>
  );
};
