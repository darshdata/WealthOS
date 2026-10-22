import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  ShieldAlert,
  Layers,
  DollarSign,
  Wallet,
  Info,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Database,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { usePortfolio } from '../context/usePortfolio';
import { formatINR, formatINRFromSubunits } from '../utils/currency';
import {
  calculateReturns,
  calculateAllocations,
  calculateConcentrationMetrics,
  getPerformanceSeries,
  formatSnapshotChartData,
} from '../utils/analyticsMath';
import {
  fetchHistoricalSnapshots,
  triggerSnapshotApi,
} from '../services/api';

const PALETTE = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#64748b', // slate
];

const PersistedSnapshotTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1 font-mono">
        <p className="font-semibold text-slate-300 font-sans">{label} ({data.valuationDate})</p>
        <p className="text-emerald-400 font-bold">
          Total Net Worth: {formatINR(data.portfolio)}
        </p>
        <p className="text-slate-300">
          Equities Holdings: {formatINR(data.holdings)}
        </p>
        <p className="text-slate-400">
          Liquid Cash: {formatINR(data.cash)}
        </p>
        <p className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-800">
          Source: MongoDB Atlas (Asia/Kolkata)
        </p>
      </div>
    );
  }
  return null;
};

const SimulatedTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-300 font-mono">{label}</p>
        <p className="text-emerald-400 font-mono font-medium">
          Portfolio: {formatINR(payload[0].value)}
        </p>
        {payload[1] && (
          <p className="text-slate-400 font-mono">
            Nifty 50 (Simulated): {formatINR(payload[1].value)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const DonutTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-semibold text-white">{data.name}</p>
        <p className="text-emerald-400 font-mono font-medium">
          {formatINRFromSubunits(data.currentSubunits)} ({data.value}%)
        </p>
      </div>
    );
  }
  return null;
};

export const AnalyticsPage = () => {
  const {
    portfolioSummary,
    cashBalance,
    isLoading: isPortfolioLoading,
    fetchError: portfolioError,
    refreshPortfolio,
    isSyncedWithBackend,
  } = usePortfolio();

  const holdings = portfolioSummary?.holdings || [];

  // Toggle between Holdings Allocation (stocks only) vs Total Portfolio Allocation (with cash)
  const [allocationMode, setAllocationMode] = useState('HOLDINGS'); // 'HOLDINGS' | 'TOTAL'
  const [allocationType, setAllocationType] = useState('SECTOR'); // 'SECTOR' | 'INSTRUMENT'

  // Persisted Snapshots State
  const [snapshots, setSnapshots] = useState([]);
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState(null);
  const [isTriggeringSnapshot, setIsTriggeringSnapshot] = useState(false);
  const [showSimulatedPreview, setShowSimulatedPreview] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // 1. Math: Returns & P&L with safe denominator
  const returnsData = useMemo(() => {
    return calculateReturns({
      investedSubunits: portfolioSummary?.totalInvestedSubunits || 0,
      currentSubunits: portfolioSummary?.totalCurrentHoldingsSubunits || 0,
    });
  }, [portfolioSummary]);

  // 2. Math: Allocation breakdown
  const allocations = useMemo(() => {
    return calculateAllocations(portfolioSummary?.holdings || [], cashBalance);
  }, [portfolioSummary, cashBalance]);

  // 3. Math: Concentration metrics
  const concentration = useMemo(() => {
    return calculateConcentrationMetrics(portfolioSummary?.holdings || [], cashBalance);
  }, [portfolioSummary, cashBalance]);

  // 4. Fetch persisted historical snapshots from MongoDB Atlas
  const loadHistoricalSnapshots = useCallback(async () => {
    setIsSnapshotsLoading(true);
    setSnapshotsError(null);
    try {
      const data = await fetchHistoricalSnapshots({ limit: 30 });
      if (data.success && Array.isArray(data.snapshots)) {
        setSnapshots(data.snapshots);
      }
    } catch (err) {
      setSnapshotsError(err.message || 'Failed to load historical snapshots from server');
    } finally {
      setIsSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchHistoricalSnapshots({ limit: 30 })
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.snapshots)) {
          setSnapshots(data.snapshots);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setSnapshotsError(err.message || 'Failed to load historical snapshots from server');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsSnapshotsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Handle manual snapshot trigger
  const handleRecordSnapshot = async () => {
    setIsTriggeringSnapshot(true);
    setActionSuccessMsg(null);
    try {
      const res = await triggerSnapshotApi({ notes: 'Manual valuation snapshot from Analytics' });
      setActionSuccessMsg(res.message || 'Valuation snapshot recorded.');
      await loadHistoricalSnapshots();
    } catch (err) {
      setSnapshotsError(err.message || 'Failed to record snapshot');
    } finally {
      setIsTriggeringSnapshot(false);
    }
  };

  // Handle seeding historical snapshots for demonstration
  const handleSeedSnapshots = async () => {
    setIsTriggeringSnapshot(true);
    setActionSuccessMsg(null);
    try {
      const res = await triggerSnapshotApi({ seedDays: 14 });
      setActionSuccessMsg(res.message || '14 historical snapshots seeded.');
      await loadHistoricalSnapshots();
    } catch (err) {
      setSnapshotsError(err.message || 'Failed to seed snapshots');
    } finally {
      setIsTriggeringSnapshot(false);
    }
  };

  // Formatted persisted snapshots for charting
  const snapshotChartData = useMemo(() => {
    return formatSnapshotChartData(snapshots);
  }, [snapshots]);

  // Illustrative simulation fallback if chosen
  const totalRupees = portfolioSummary?.totalPortfolioValueRupees || 500000;
  const simulatedSeriesData = useMemo(() => {
    return getPerformanceSeries(totalRupees);
  }, [totalRupees]);

  // Prepared data for Donut Chart
  const chartPieData = useMemo(() => {
    const isHoldings = allocationMode === 'HOLDINGS';

    if (allocationType === 'SECTOR') {
      const items = allocations.sectorAllocations.map((s, idx) => ({
        name: s.sector,
        value: isHoldings ? s.holdingsPercent : s.portfolioPercent,
        currentSubunits: s.currentSubunits,
        color: PALETTE[idx % PALETTE.length],
      }));

      if (!isHoldings && allocations.cashSubunits > 0) {
        items.push({
          name: 'Cash Reserve (Liquidity)',
          value: allocations.cashAllocationPercent,
          currentSubunits: allocations.cashSubunits,
          color: '#64748b',
        });
      }
      return items.filter((i) => i.value > 0);
    } else {
      const items = allocations.instrumentAllocations.map((inst, idx) => ({
        name: `${inst.symbol} - ${inst.name}`,
        value: isHoldings ? inst.holdingsPercent : inst.portfolioPercent,
        currentSubunits: inst.currentSubunits,
        color: PALETTE[idx % PALETTE.length],
      }));

      if (!isHoldings && allocations.cashSubunits > 0) {
        items.push({
          name: 'Cash Reserve',
          value: allocations.cashAllocationPercent,
          currentSubunits: allocations.cashSubunits,
          color: '#64748b',
        });
      }
      return items.filter((i) => i.value > 0);
    }
  }, [allocations, allocationMode, allocationType]);

  const totalDisplaySubunits =
    allocationMode === 'HOLDINGS'
      ? allocations.totalHoldingsSubunits
      : allocations.totalPortfolioSubunits;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800/80 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Portfolio Analytics Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                {isSyncedWithBackend ? 'Atlas Persisted' : 'Optimistic Memory'}
              </span>
              {snapshotChartData.hasHistory ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  {snapshotChartData.count} Persisted Daily Snapshots
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {snapshotChartData.count === 1 ? '1 Daily Snapshot' : 'Awaiting Snapshots'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Capital Allocation &amp; Concentration Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Transparent distinction between persisted MongoDB valuation snapshots and simulated market dynamics. All valuations computed in integer paise (Asia/Kolkata timezone).
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={async () => {
                await refreshPortfolio();
                await loadHistoricalSnapshots();
              }}
              disabled={isPortfolioLoading || isSnapshotsLoading}
              title="Refresh balances and snapshots from MongoDB Atlas"
              className="px-3.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isPortfolioLoading || isSnapshotsLoading ? 'animate-spin text-emerald-400' : ''
                }`}
              />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Action Notification Message */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert State */}
      {(portfolioError || snapshotsError) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{portfolioError || snapshotsError}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (portfolioError) await refreshPortfolio();
              if (snapshotsError) await loadHistoricalSnapshots();
            }}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Primary Returns & P&L Cards Row (Current Authoritative Snapshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Invested Cost Basis */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Invested Cost Basis
          </p>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {formatINRFromSubunits(returnsData.investedSubunits)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {returnsData.hasInvestedCapital
              ? `Across ${holdings.length} active positions`
              : 'Zero capital deployed in positions'}
          </p>
        </div>

        {/* Current Holdings Valuation */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Current Holdings Value
          </p>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {formatINRFromSubunits(returnsData.currentSubunits)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Mark-to-market live valuation</p>
        </div>

        {/* Unrealized Gain / P&L with Safe Percentage */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
            {returnsData.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            Unrealized P&amp;L
          </p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              returnsData.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {returnsData.pnlSubunits >= 0 ? '+' : ''}
            {formatINRFromSubunits(returnsData.pnlSubunits)}
          </p>
          <p
            className={`text-[11px] font-semibold font-mono mt-1 ${
              returnsData.isPositive ? 'text-emerald-400/90' : 'text-rose-400/90'
            }`}
          >
            {returnsData.hasInvestedCapital
              ? `${returnsData.returnPercent >= 0 ? '+' : ''}${returnsData.returnPercent.toFixed(2)}% net return`
              : '0.00% (No invested base)'}
          </p>
        </div>

        {/* Deployable Cash vs Total Portfolio Net Worth */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-slate-500" /> Uninvested Cash
          </p>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {formatINRFromSubunits(cashBalance)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            {allocations.cashAllocationPercent}% of {formatINRFromSubunits(allocations.totalPortfolioSubunits)} net worth
          </p>
        </div>
      </div>

      {/* Historical Portfolio Performance Trajectory Section */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">
                Portfolio Valuation Trajectory
              </h2>
              {snapshotChartData.hasHistory ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Persisted Snapshots ({snapshotChartData.count} days)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {showSimulatedPreview ? 'Illustrative Simulation' : 'Awaiting History'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {snapshotChartData.hasHistory
                ? `Actual End-of-Day (EOD) portfolio valuation trajectory from MongoDB Atlas (${snapshotChartData.series[0]?.valuationDate} to ${snapshotChartData.series[snapshotChartData.series.length - 1]?.valuationDate})`
                : 'Timestamped valuation snapshots recorded in Asia/Kolkata timezone'}
            </p>
          </div>

          {/* Snapshot Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleRecordSnapshot}
              disabled={isTriggeringSnapshot}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1"
              title="Record current portfolio valuation as today's snapshot"
            >
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>Record Today</span>
            </button>

            {!snapshotChartData.hasHistory && (
              <button
                type="button"
                onClick={handleSeedSnapshots}
                disabled={isTriggeringSnapshot}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-colors flex items-center gap-1 shadow-sm"
                title="Seed 14 daily historical snapshots for testing & demonstration"
              >
                <Sparkles className="w-3 h-3 text-slate-950" />
                <span>Seed 14D History</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Architecture Transparency Banner */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-300">
              Data Integrity &amp; Snapshot Audit Policy
            </p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {snapshotChartData.hasHistory ? (
                <>
                  The trajectory below plots <strong>actual persisted daily valuation snapshots</strong> stored in MongoDB Atlas under collection <code>portfolio_snapshots</code> with unique constraint <code>&#123; userId, valuationDate &#125;</code>. Valuations are computed using server-side prices and integer paise arithmetic.
                </>
              ) : (
                <>
                  WealthOS enforces institutional reporting integrity: historical portfolio performance is only plotted when actual persisted snapshots exist in MongoDB Atlas. If fewer than 2 snapshots exist, the system explicitly reports the limitation rather than fabricating historical data.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Chart View or Empty/Insufficient History Card */}
        {isSnapshotsLoading ? (
          <div className="h-72 flex flex-col items-center justify-center text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading historical snapshots from MongoDB Atlas...</p>
          </div>
        ) : snapshotChartData.hasHistory ? (
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={snapshotChartData.series}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="persistedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
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
                />
                <Tooltip content={<PersistedSnapshotTooltip />} />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  name="Total Net Worth"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#persistedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : showSimulatedPreview ? (
          /* Explicitly Labeled Simulated Preview */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Illustrative Simulation Preview (Not Persisted History)
              </span>
              <button
                type="button"
                onClick={() => setShowSimulatedPreview(false)}
                className="text-slate-400 hover:text-white underline"
              >
                Close Preview
              </button>
            </div>
            <div className="w-full h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={simulatedSeriesData.series}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="simGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<SimulatedTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#simGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* Empty / Insufficient Persisted History State */
          <div className="py-10 px-4 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                {snapshots.length === 1
                  ? 'Single Daily Snapshot Recorded'
                  : 'No Historical Snapshots Recorded Yet'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {snapshots.length === 1
                  ? `Only 1 snapshot exists for ${snapshots[0].valuationDate}. At least 2 daily snapshots are required to plot a historical trajectory curve.`
                  : 'WealthOS records daily valuation snapshots in Asia/Kolkata timezone. Click "Seed 14D History" to generate demo historical points or "Record Today" to record your current snapshot.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSeedSnapshots}
                disabled={isTriggeringSnapshot}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-colors shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Seed 14-Day History
              </button>
              <button
                type="button"
                onClick={() => setShowSimulatedPreview(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Preview Simulation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Allocation Breakdown & Asset Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Donut Allocation Chart */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
                Allocation Breakdown
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {allocationMode === 'HOLDINGS'
                ? 'Equities exposure (% of invested stock holdings)'
                : 'Net capital exposure (% of portfolio including cash)'}
            </p>
          </div>

          {/* Toggle Controls: Holdings vs Total Portfolio */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setAllocationMode('HOLDINGS')}
                className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                  allocationMode === 'HOLDINGS'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Equities Only
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('TOTAL')}
                className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                  allocationMode === 'TOTAL'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Total (+ Cash)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setAllocationType('SECTOR')}
                className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                  allocationType === 'SECTOR'
                    ? 'bg-slate-800 text-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                By Sector
              </button>
              <button
                type="button"
                onClick={() => setAllocationType('INSTRUMENT')}
                className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                  allocationType === 'INSTRUMENT'
                    ? 'bg-slate-800 text-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                By Asset
              </button>
            </div>
          </div>

          {/* Donut Chart */}
          {chartPieData.length > 0 ? (
            <div className="w-full h-56 relative my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<DonutTooltip />} />
                  <Pie
                    data={chartPieData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={entry.color}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centered label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  {allocationMode === 'HOLDINGS' ? 'Held Value' : 'Net Worth'}
                </span>
                <span className="text-xs font-bold text-white font-mono text-center px-1 truncate max-w-[120px]">
                  {formatINRFromSubunits(totalDisplaySubunits)}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs font-semibold text-slate-400">No active positions</p>
              <p className="text-[11px] text-slate-500 mt-1">Execute a trade to view asset allocation</p>
            </div>
          )}

          {/* Breakdown Legend List */}
          <div className="space-y-2 border-t border-slate-800/60 pt-3 max-h-48 overflow-y-auto">
            {chartPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-slate-300 font-medium truncate">{item.name}</span>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <span className="text-white font-semibold">{item.value}%</span>
                  <span className="text-slate-500 text-[10px] block">
                    {formatINRFromSubunits(item.currentSubunits)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Allocation Ledger Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Allocation Exposure Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Detailed side-by-side comparison of holdings weight vs total portfolio weight
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              {allocations.holdingsCount} Positions • {allocations.sectorCount} Sectors
            </span>
          </div>

          {allocations.instrumentAllocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="pb-3">Instrument</th>
                    <th className="pb-3">Sector</th>
                    <th className="pb-3 text-right">Shares</th>
                    <th className="pb-3 text-right">Current Value</th>
                    <th className="pb-3 text-right">Equities %</th>
                    <th className="pb-3 text-right">Portfolio %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {allocations.instrumentAllocations.map((item) => (
                    <tr key={item.symbol} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-bold text-white font-mono">
                        <div>
                          <span>{item.symbol}</span>
                          <span className="text-[11px] text-slate-400 font-sans block truncate max-w-[140px]">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-sans text-slate-300">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
                          {item.sector}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-300">{item.quantity}</td>
                      <td className="py-3 text-right text-white font-bold">
                        {formatINRFromSubunits(item.currentSubunits)}
                      </td>
                      <td className="py-3 text-right text-emerald-400 font-bold">
                        {item.holdingsPercent.toFixed(2)}%
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        {item.portfolioPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {/* Cash Line Entry */}
                  <tr className="bg-slate-950/40 text-slate-400 font-mono">
                    <td className="py-3 font-bold text-slate-300">CASH RESERVE</td>
                    <td className="py-3 font-sans">Liquid Balance</td>
                    <td className="py-3 text-right">—</td>
                    <td className="py-3 text-right text-emerald-400 font-bold">
                      {formatINRFromSubunits(allocations.cashSubunits)}
                    </td>
                    <td className="py-3 text-right text-slate-500">—</td>
                    <td className="py-3 text-right text-emerald-400 font-bold">
                      {allocations.cashAllocationPercent.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No holdings in portfolio. Zero positions to allocate.
            </div>
          )}
        </div>
      </div>

      {/* Risk & Concentration Analytics Section */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Concentration &amp; Exposure Analysis
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Capital dispersion and single-instrument exposure metrics
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                concentration.concentrationLevel === 'HIGH'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : concentration.concentrationLevel === 'MODERATE'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {concentration.concentrationLevel} CONCENTRATION
            </span>
          </div>
        </div>

        {/* Institutional Scope Clarification */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-slate-300">Model Scope:</strong> Concentration metrics reflect capital weighting distribution (CR3, CR5, and the Herfindahl-Hirschman Index). They indicate single-asset and single-sector reliance, but do not constitute an empirical multi-factor risk model. Econometric metrics such as Annualized Volatility, Sharpe Ratio, and Beta require continuous historical time-series data.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Largest Single Holding */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <p className="text-[11px] text-slate-400 uppercase font-semibold">
              Largest Position
            </p>
            {concentration.largestPosition ? (
              <>
                <p className="text-base font-bold text-white font-mono">
                  {concentration.largestPosition.symbol}
                </p>
                <p className="text-xs text-emerald-400 font-mono font-semibold">
                  {concentration.largestHoldingPercent.toFixed(2)}% of holdings
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {formatINRFromSubunits(concentration.largestPosition.currentSubunits)} (
                  {concentration.largestPosition.portfolioPercent.toFixed(2)}% total)
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">None (0 positions)</p>
            )}
          </div>

          {/* Top-3 Concentration (CR3) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 uppercase font-semibold">Top 3 Holdings (CR3)</span>
              <span className="text-white font-mono font-bold">
                {concentration.top3ConcentrationPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, concentration.top3ConcentrationPercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Share of top 3 assets out of total equities
            </p>
          </div>

          {/* Largest Sector Exposure */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <p className="text-[11px] text-slate-400 uppercase font-semibold">
              Largest Sector
            </p>
            {concentration.largestSector ? (
              <>
                <p className="text-base font-bold text-white truncate">
                  {concentration.largestSector.sector}
                </p>
                <p className="text-xs text-emerald-400 font-mono font-semibold">
                  {concentration.largestSector.holdingsPercent.toFixed(2)}% of holdings
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {concentration.largestSector.positionCount} {concentration.largestSector.positionCount === 1 ? 'position' : 'positions'}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">None</p>
            )}
          </div>

          {/* Herfindahl-Hirschman Index (HHI) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <p className="text-[11px] text-slate-400 uppercase font-semibold">
              Herfindahl Index (HHI)
            </p>
            <p className="text-base font-bold text-white font-mono">
              {concentration.herfindahlIndex}
              <span className="text-xs font-normal text-slate-400"> / 10,000</span>
            </p>
            <p className="text-[11px] text-slate-400">
              {concentration.herfindahlIndex >= 2500
                ? 'High single-asset concentration'
                : concentration.herfindahlIndex >= 1500
                ? 'Moderate sector dispersion'
                : 'Well-diversified asset dispersion'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
