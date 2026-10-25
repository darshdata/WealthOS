import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  History,
  CheckCircle2,
  AlertCircle,
  Layers,
  DollarSign,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import { usePortfolio } from '../context/usePortfolio';
import { formatINRFromSubunits } from '../utils/currency';
import { TradeModal } from '../components/TradeModal';

export const HoldingsPage = () => {
  const {
    portfolioSummary,
    transactions,
    isLoading,
    fetchError,
    refreshPortfolio,
    isSyncedWithBackend,
  } = usePortfolio();

  const holdings = portfolioSummary?.holdings || [];

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [sortBy, setSortBy] = useState('currentValue'); // 'currentValue' | 'pnl' | 'returnPercent' | 'quantity' | 'symbol'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [txFilterSide, setTxFilterSide] = useState('ALL'); // 'ALL' | 'BUY' | 'SELL'

  // Modal State for Trade Trigger
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  // Extract unique sectors from active holdings
  const availableSectors = useMemo(() => {
    const holdings = portfolioSummary?.holdings || [];
    const sectors = new Set(holdings.map((h) => h.sector).filter(Boolean));
    return Array.from(sectors);
  }, [portfolioSummary]);

  // Filter and sort holdings
  const filteredAndSortedHoldings = useMemo(() => {
    const holdings = portfolioSummary?.holdings || [];
    return holdings
      .filter((h) => {
        // Search filter (symbol or name)
        const matchesSearch =
          !searchQuery.trim() ||
          h.symbol.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          h.name.toLowerCase().includes(searchQuery.trim().toLowerCase());

        // Sector filter
        const matchesSector =
          selectedSector === 'ALL' || h.sector === selectedSector;

        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'currentValue':
            comparison = (a.currentSubunits || 0) - (b.currentSubunits || 0);
            break;
          case 'pnl':
            comparison = (a.pnlSubunits || 0) - (b.pnlSubunits || 0);
            break;
          case 'returnPercent':
            comparison = (a.returnPercent || 0) - (b.returnPercent || 0);
            break;
          case 'quantity':
            comparison = (a.quantity || 0) - (b.quantity || 0);
            break;
          case 'symbol':
            comparison = a.symbol.localeCompare(b.symbol);
            break;
          default:
            comparison = (a.currentSubunits || 0) - (b.currentSubunits || 0);
        }
        return sortDirection === 'desc' ? -comparison : comparison;
      });
  }, [portfolioSummary, searchQuery, selectedSector, sortBy, sortDirection]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (txFilterSide === 'ALL') return transactions;
    return transactions.filter((tx) => tx.type === txFilterSide);
  }, [transactions, txFilterSide]);

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedSector !== 'ALL' || sortBy !== 'currentValue' || sortDirection !== 'desc';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSector('ALL');
    setSortBy('currentValue');
    setSortDirection('desc');
  };

  const handleOpenTrade = (instrument) => {
    setSelectedInstrument(instrument);
    setIsTradeModalOpen(true);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* Page Header & Summary Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800/80 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 shrink-0" />
                Asset Ledger
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                {isSyncedWithBackend ? 'Atlas Synced' : 'Optimistic Client State'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Multi-Asset Holdings &amp; Audit Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Track live valuations, cost basis allocations, and complete order execution history. All figures computed in sub-cent integer paise.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={refreshPortfolio}
              disabled={isLoading}
              title="Refresh ledger state from server"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Sync Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenTrade(holdings[0] || null)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              New Order
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Error Alert State */}
      {fetchError && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={refreshPortfolio}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold transition-colors shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Valuation Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
            <DollarSign className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Current Value
          </p>
          <p className="text-base sm:text-lg font-bold text-white font-mono mt-1 truncate" title={portfolioSummary?.formattedHoldingsValue}>
            {portfolioSummary?.formattedHoldingsValue || '₹0.00'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            {holdings.length} {holdings.length === 1 ? 'position' : 'positions'}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Invested Capital
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-200 font-mono mt-1 truncate" title={portfolioSummary?.formattedTotalInvested}>
            {portfolioSummary?.formattedTotalInvested || '₹0.00'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">Total purchase cost</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Unrealized P&amp;L
          </p>
          <p
            className={`text-base sm:text-lg font-bold font-mono mt-1 truncate ${
              portfolioSummary?.isPnLPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
            title={portfolioSummary?.formattedUnrealizedPnL}
          >
            {portfolioSummary?.formattedUnrealizedPnL || '₹0.00'}
          </p>
          <p
            className={`text-[10px] sm:text-[11px] font-semibold font-mono truncate ${
              portfolioSummary?.isPnLPositive ? 'text-emerald-400/90' : 'text-rose-400/90'
            }`}
          >
            {portfolioSummary?.formattedUnrealizedPnLPercent || '0.00%'} all-time
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
            <Wallet className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Deployable Cash
          </p>
          <p className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-1 truncate" title={portfolioSummary?.formattedCashBalance}>
            {portfolioSummary?.formattedCashBalance || '₹0.00'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">Liquid cash balance</p>
        </div>
      </div>

      {/* Main Holdings Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4 min-w-0">
        {/* Controls Toolbar: Search, Filter, Sort, Clear */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol or name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
              />
            </div>

            {/* Sector Filter Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/70 transition-all cursor-pointer"
              >
                <option value="ALL">All Sectors ({holdings.length})</option>
                {availableSectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Controls & Counter */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/70 cursor-pointer"
            >
              <option value="currentValue">Current Value</option>
              <option value="pnl">Unrealized P&amp;L</option>
              <option value="returnPercent">Return %</option>
              <option value="quantity">Shares Count</option>
              <option value="symbol">Ticker Symbol</option>
            </select>

            <button
              type="button"
              onClick={toggleSortDirection}
              title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'} (click to toggle)`}
              className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <ArrowDown className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>
            )}

            <span className="text-xs text-slate-500 font-mono pl-1 hidden lg:inline">
              Showing {filteredAndSortedHoldings.length} of {holdings.length}
            </span>
          </div>
        </div>

        {/* Loading Skeleton State */}
        {isLoading && holdings.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Loading portfolio holdings...</p>
            <p className="text-xs text-slate-500">Synchronizing balances with MongoDB Atlas cluster</p>
          </div>
        ) : filteredAndSortedHoldings.length > 0 ? (
          <>
            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Instrument</th>
                    <th className="pb-3 font-semibold">Sector</th>
                    <th className="pb-3 font-semibold text-right">Shares &amp; Avg Buy</th>
                    <th className="pb-3 font-semibold text-right">LTP (Simulated)</th>
                    <th className="pb-3 font-semibold text-right">Invested Value</th>
                    <th className="pb-3 font-semibold text-right">Current Value</th>
                    <th className="pb-3 font-semibold text-right">P&amp;L (% Return)</th>
                    <th className="pb-3 font-semibold text-center">Weight</th>
                    <th className="pb-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAndSortedHoldings.map((asset) => {
                    const isDayPos = asset.change24h >= 0;
                    const isPnlPos = asset.isPositive;

                    return (
                      <tr key={asset.symbol} className="hover:bg-slate-800/40 transition-colors">
                        {/* Instrument Name & Symbol */}
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold font-mono text-emerald-400 text-xs shrink-0">
                              {asset.symbol.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white font-mono flex items-center gap-1.5">
                                {asset.symbol}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                {asset.name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Sector */}
                        <td className="py-3.5 pr-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                            {asset.sector}
                          </span>
                        </td>

                        {/* Quantity & Avg Buy */}
                        <td className="py-3.5 text-right font-mono pr-2">
                          <p className="font-bold text-slate-200">{asset.quantity} shares</p>
                          <p className="text-[11px] text-slate-500">
                            Avg: {formatINRFromSubunits(asset.avgBuyPrice)}
                          </p>
                        </td>

                        {/* Current Market Price (LTP) */}
                        <td className="py-3.5 text-right font-mono pr-2">
                          <p className="font-bold text-white">{asset.formattedCurrentPrice}</p>
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                              isDayPos ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isDayPos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {isDayPos ? '+' : ''}
                            {asset.change24h}%
                          </span>
                        </td>

                        {/* Invested Value */}
                        <td className="py-3.5 text-right font-mono text-slate-300 pr-2">
                          {asset.formattedInvested}
                        </td>

                        {/* Current Market Value */}
                        <td className="py-3.5 text-right font-mono font-bold text-white pr-2">
                          {asset.formattedCurrent}
                        </td>

                        {/* Unrealized P&L */}
                        <td className="py-3.5 text-right font-mono pr-2">
                          <p className={`font-bold ${isPnlPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {asset.formattedPnl}
                          </p>
                          <p className={`text-[11px] ${isPnlPos ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                            {asset.formattedReturnPercent}
                          </p>
                        </td>

                        {/* Weight */}
                        <td className="py-3.5 text-center px-2">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-slate-300 font-mono text-[11px]">
                              {asset.allocationPercent}
                            </span>
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: asset.allocationPercent }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Quick Trade Trigger */}
                        <td className="py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenTrade(asset)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 font-semibold text-[11px] transition-all border border-slate-700/80 inline-flex items-center gap-1 shadow-sm"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                            Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden space-y-3">
              {filteredAndSortedHoldings.map((asset) => {
                const isDayPos = asset.change24h >= 0;
                const isPnlPos = asset.isPositive;

                return (
                  <div
                    key={asset.symbol}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
                  >
                    {/* Top Row: Symbol, Name, Sector & Trade button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold font-mono text-emerald-400 text-xs shrink-0">
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-white font-mono text-sm">{asset.symbol}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{asset.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {asset.sector.split(' ')[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenTrade(asset)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1"
                        >
                          <ArrowUpDown className="w-3 h-3" /> Trade
                        </button>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Shares Held</span>
                        <p className="font-mono font-semibold text-slate-200">
                          {asset.quantity} @ {formatINRFromSubunits(asset.avgBuyPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] uppercase">LTP (Market)</span>
                        <p className="font-mono font-bold text-white flex items-center justify-end gap-1">
                          {asset.formattedCurrentPrice}
                          <span
                            className={`text-[10px] ${isDayPos ? 'text-emerald-400' : 'text-rose-400'}`}
                          >
                            {isDayPos ? '+' : ''}{asset.change24h}%
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Market Value</span>
                        <p className="font-mono font-bold text-white">{asset.formattedCurrent}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Invested: {asset.formattedInvested}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] uppercase">Unrealized P&amp;L</span>
                        <p
                          className={`font-mono font-bold ${
                            isPnlPos ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {asset.formattedPnl}
                        </p>
                        <p
                          className={`text-[10px] font-mono ${
                            isPnlPos ? 'text-emerald-400/90' : 'text-rose-400/90'
                          }`}
                        >
                          {asset.formattedReturnPercent}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Empty / No Matches State */
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {holdings.length === 0
                ? 'No active positions in portfolio'
                : 'No positions match your filter criteria'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {holdings.length === 0
                ? 'Your portfolio currently holds zero shares. Search for an instrument or open the trade modal to execute a BUY order.'
                : 'Try adjusting your search query, selecting another sector, or resetting your filters.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400 shrink-0" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Order Execution &amp; Transaction Ledger
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Immutable audit trail recorded on MongoDB Atlas.
            </p>
          </div>

          {/* Filter Tabs by Side */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
            {['ALL', 'BUY', 'SELL'].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setTxFilterSide(side)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  txFilterSide === side
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions && filteredTransactions.length > 0 ? (
          <>
            {/* Desktop & Tablet Table (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Side</th>
                    <th className="pb-3 font-semibold">Instrument</th>
                    <th className="pb-3 font-semibold text-right">Quantity</th>
                    <th className="pb-3 font-semibold text-right">Execution Price</th>
                    <th className="pb-3 font-semibold text-right">Total Trade Value</th>
                    <th className="pb-3 font-semibold text-center">Status</th>
                    <th className="pb-3 font-semibold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredTransactions.map((tx) => {
                    const isBuy = tx.type === 'BUY';
                    const dateStr = tx.timestamp
                      ? new Date(tx.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    return (
                      <tr key={tx._id || tx.idempotencyKey || tx.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Side */}
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              isBuy
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>

                        {/* Symbol */}
                        <td className="py-3 font-bold text-white font-mono">
                          {tx.symbol}
                        </td>

                        {/* Quantity */}
                        <td className="py-3 text-right text-slate-200">
                          {tx.quantity} {tx.quantity === 1 ? 'share' : 'shares'}
                        </td>

                        {/* Execution Price */}
                        <td className="py-3 text-right text-slate-300">
                          {formatINRFromSubunits(tx.executionPricePaise || tx.pricePerUnit || 0)}
                        </td>

                        {/* Total Value */}
                        <td className="py-3 text-right font-bold text-slate-200">
                          {formatINRFromSubunits(tx.totalValuePaise || tx.totalAmount || 0)}
                        </td>

                        {/* Status */}
                        <td className="py-3 text-center">
                          {tx.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> {tx.status || 'Pending'}
                            </span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 text-right text-slate-400 text-[11px] font-sans">
                          {dateStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Transaction Cards (< md) */}
            <div className="md:hidden space-y-3 font-mono">
              {filteredTransactions.map((tx) => {
                const isBuy = tx.type === 'BUY';
                const dateStr = tx.timestamp
                  ? new Date(tx.timestamp).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                return (
                  <div
                    key={tx._id || tx.idempotencyKey || tx.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="font-bold text-white font-mono text-sm">{tx.symbol}</span>
                      </div>
                      <div>
                        {tx.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" /> {tx.status || 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-sans">Shares &amp; Price</span>
                        <p className="text-slate-200 font-semibold mt-0.5">
                          {tx.quantity} {tx.quantity === 1 ? 'share' : 'shares'} @ {formatINRFromSubunits(tx.executionPricePaise || tx.pricePerUnit || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] uppercase font-sans">Total Value</span>
                        <p className="text-white font-bold mt-0.5">
                          {formatINRFromSubunits(tx.totalValuePaise || tx.totalAmount || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-sans pt-1 border-t border-slate-800/40 flex justify-between items-center">
                      <span>Execution Date</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">
            No {txFilterSide === 'ALL' ? '' : `${txFilterSide} `}transactions recorded in ledger.
          </div>
        )}
      </div>

      {/* Trade Execution Modal */}
      <TradeModal
        instrument={selectedInstrument}
        isOpen={isTradeModalOpen}
        onClose={() => {
          setIsTradeModalOpen(false);
          setSelectedInstrument(null);
        }}
      />
    </div>
  );
};
