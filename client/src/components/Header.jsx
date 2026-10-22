import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Loader2,
  X,
  Zap,
} from 'lucide-react';
import { searchMarketInstruments } from '../services/marketFeed';
import { usePortfolio } from '../context/usePortfolio';
import { formatINRFromSubunits } from '../utils/currency';
import { TradeModal } from './TradeModal';

export const Header = () => {
  const { livePrices } = usePortfolio();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounced search with AbortController cancellation
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Cancel previous in-flight search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const matches = await searchMarketInstruments(trimmed, controller.signal);
        setResults(matches);
        setIsLoading(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[Search Error]:', err);
          setIsLoading(false);
        }
      }
    }, 250); // 250ms debounce before dispatching query

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside listener to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenTrade = (instrument) => {
    setSelectedInstrument(instrument);
    setIsTradeModalOpen(true);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setIsOpen(true);
  };

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Title & Live Status */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Institutional Portfolio Console</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Streaming Feed
              </span>
              <span>•</span>
              <span className="text-slate-500 font-mono text-[11px]">NSE/BSE Real-Time Feed (INR)</span>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="flex items-center gap-3">
          {/* Market Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Market Engine</span>
          </div>

          {/* Functional Search Bar with Debounce & Cancellation */}
          <div ref={searchContainerRef} className="relative hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                placeholder="Search tickers (e.g. RELIANCE, TCS)... (⌘K)"
                className="w-72 pl-9 pr-8 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
              />
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setIsLoading(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Search Dropdown Results */}
            {isOpen && query.trim() && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/40">
                  <span>Instruments ({results.length})</span>
                  <span className="font-mono text-[10px]">ESC to close</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {results.length > 0 ? (
                    results.map((item) => {
                      const live = livePrices[item.symbol];
                      const currentPrice = live ? live.price : item.basePrice;
                      const change24h = live ? live.change24h : item.change24h;
                      const isPositive = change24h >= 0;

                      return (
                        <div
                          key={item.symbol}
                          className="p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-xs">
                                {item.symbol}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {item.sector}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.name}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-mono font-bold text-white text-xs">
                                {formatINRFromSubunits(currentPrice)}
                              </p>
                              <span
                                className={`text-[10px] font-mono font-semibold flex items-center justify-end gap-0.5 ${
                                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isPositive ? (
                                  <TrendingUp className="w-2.5 h-2.5" />
                                ) : (
                                  <TrendingDown className="w-2.5 h-2.5" />
                                )}
                                {isPositive ? '+' : ''}
                                {change24h}%
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenTrade(item)}
                              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-all shadow-sm shadow-emerald-500/20"
                            >
                              Trade
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : !isLoading ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No instruments found matching "{query}"
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      Searching instruments...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            aria-label="Filter view"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400"></span>
          </button>
        </div>
      </header>

      {/* Trade Execution Modal */}
      <TradeModal
        instrument={selectedInstrument}
        isOpen={isTradeModalOpen}
        onClose={() => {
          setIsTradeModalOpen(false);
          setSelectedInstrument(null);
        }}
      />
    </>
  );
};
