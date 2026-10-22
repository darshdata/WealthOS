import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePortfolio } from '../context/usePortfolio';
import { formatINRFromSubunits } from '../utils/currency';

export const TradeModal = ({ instrument, isOpen, onClose }) => {
  const { livePrices, cashBalance, holdings, executeTrade } = usePortfolio();
  const [tradeType, setTradeType] = useState('BUY');
  const [quantity, setQuantity] = useState(1);
  const [notification, setNotification] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !instrument) return null;

  const currentPricePaise =
    livePrices[instrument.symbol]?.price ?? instrument.basePrice ?? instrument.currentPriceSubunits;
  const currentHolding = holdings.find((h) => h.symbol === instrument.symbol);
  const ownedQty = currentHolding ? currentHolding.quantity : 0;

  const totalPaise = Math.round(currentPricePaise * (parseInt(quantity, 10) || 0));

  const handleExecute = async (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setNotification({ type: 'error', message: 'Enter a valid quantity greater than 0' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await executeTrade({
        symbol: instrument.symbol,
        name: instrument.name,
        sector: instrument.sector,
        type: tradeType,
        quantity: qty,
        pricePerUnit: currentPricePaise,
      });

      if (result.success) {
        setNotification({
          type: 'success',
          message: `Successfully executed ${tradeType} order for ${qty} ${instrument.symbol}`,
        });
        setTimeout(() => {
          setNotification(null);
          setIsSubmitting(false);
          onClose();
        }, 1200);
      } else {
        setNotification({ type: 'error', message: result.error });
        setIsSubmitting(false);
      }
    } catch {
      setNotification({ type: 'error', message: 'Unexpected trade execution failure' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-white">{instrument.symbol}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-medium">
                {instrument.sector || 'NSE/BSE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{instrument.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Price Header */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Market Execution Price (LTP)</span>
            <p className="text-base font-bold text-white font-mono mt-0.5">
              {formatINRFromSubunits(currentPricePaise)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Position Held</span>
            <p className="font-mono font-semibold text-slate-200 mt-0.5">
              {ownedQty} {ownedQty === 1 ? 'Share' : 'Shares'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExecute} className="p-5 space-y-4">
          {/* Order Side Selector */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTradeType('BUY')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tradeType === 'BUY'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              BUY (Long)
            </button>
            <button
              type="button"
              onClick={() => setTradeType('SELL')}
              disabled={ownedQty === 0}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                ownedQty === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : tradeType === 'SELL'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              SELL (Exit)
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <label htmlFor="trade-qty">Order Quantity</label>
              <span>{tradeType === 'BUY' ? 'Unlimited' : `Max: ${ownedQty}`}</span>
            </div>
            <div className="relative">
              <input
                id="trade-qty"
                type="number"
                min="1"
                max={tradeType === 'SELL' ? ownedQty : undefined}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                {[1, 5, 10, 25].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-white"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Estimated Order Value</span>
              <span className="font-mono font-bold text-white">
                {formatINRFromSubunits(totalPaise)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-800/60 text-[11px]">
              <span>Available Cash Balance</span>
              <span className="font-mono text-emerald-400">
                {formatINRFromSubunits(cashBalance)}
              </span>
            </div>
          </div>

          {/* Notifications */}
          {notification && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                notification.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              tradeType === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20'
            }`}
          >
            {isSubmitting ? 'Executing Order...' : `Confirm ${tradeType} Execution`}
          </button>
        </form>
      </div>
    </div>
  );
};
