import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { usePortfolio } from '../context/usePortfolio';
import { formatINRFromSubunits } from '../utils/currency';
import { TradeModal } from './TradeModal';

export const AssetsTable = () => {
  const { portfolioSummary } = usePortfolio();
  const holdings = portfolioSummary.holdings || [];

  const [tradeInstrument, setTradeInstrument] = useState(null);
  const [isTradeOpen, setIsTradeOpen] = useState(false);

  const handleOpenTrade = (asset) => {
    setTradeInstrument(asset);
    setIsTradeOpen(true);
  };

  return (
    <>
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Core Holdings Snapshot</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {holdings.length} Active Positions
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live market valuation computed in integer paise subunits
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400">Total Holdings Value</span>
            <p className="text-sm font-bold text-emerald-400 font-mono">
              {portfolioSummary.formattedHoldingsValue}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Asset / Ticker</th>
                <th className="pb-3 font-semibold">Quantity & Avg Buy</th>
                <th className="pb-3 font-semibold">Weight</th>
                <th className="pb-3 font-semibold text-right">LTP / 24H</th>
                <th className="pb-3 font-semibold text-right">Current Value & P&amp;L</th>
                <th className="pb-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {holdings.length > 0 ? (
                holdings.map((asset) => {
                  const isDayPositive = asset.change24h >= 0;
                  const isPnLPositive = asset.isPositive;

                  return (
                    <tr key={asset.symbol} className="hover:bg-slate-800/40 transition-colors">
                      {/* Asset Ticker & Name */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold font-mono text-emerald-400 text-xs shrink-0">
                            {asset.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-white font-mono flex items-center gap-1.5">
                              {asset.symbol}
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                                {asset.sector.split(' ')[0]}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-none">
                              {asset.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Quantity & Avg Buy */}
                      <td className="py-3.5">
                        <p className="font-mono font-semibold text-slate-200">
                          {asset.quantity} shares
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Avg: {formatINRFromSubunits(asset.avgBuyPrice)}
                        </p>
                      </td>

                      {/* Weight progress bar */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: asset.allocationPercent }}
                            ></div>
                          </div>
                          <span className="text-slate-300 font-mono text-[11px]">
                            {asset.allocationPercent}
                          </span>
                        </div>
                      </td>

                      {/* LTP & 24H Change */}
                      <td className="py-3.5 text-right font-mono">
                        <p className="font-bold text-white text-xs">
                          {asset.formattedCurrentPrice}
                        </p>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                            isDayPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isDayPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                          )}
                          {isDayPositive ? '+' : ''}
                          {asset.change24h}%
                        </span>
                      </td>

                      {/* Total Holding Value & Unrealized PnL */}
                      <td className="py-3.5 text-right font-mono">
                        <p className="font-bold text-slate-200">
                          {asset.formattedCurrent}
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${
                            isPnLPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {asset.formattedPnl} ({asset.formattedReturnPercent})
                        </p>
                      </td>

                      {/* Action Trade Button */}
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenTrade(asset)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 font-semibold text-[11px] transition-all border border-slate-700/80 inline-flex items-center gap-1"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          Trade
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No active positions held. Search instruments above to execute a trade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TradeModal
        instrument={tradeInstrument}
        isOpen={isTradeOpen}
        onClose={() => {
          setIsTradeOpen(false);
          setTradeInstrument(null);
        }}
      />
    </>
  );
};
