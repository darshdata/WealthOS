import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  toSubunits,
  fromSubunits,
  formatINRFromSubunits,
  calculatePnL,
} from '../utils/currency';
import {
  MARKET_INSTRUMENTS,
  createMarketTickStream,
} from '../services/marketFeed';
import { fetchPortfolio, executeTradeApi } from '../services/api';
import { PortfolioContext } from './portfolioContextDef';

// Initial demo portfolio holdings (prices in integer paise)
const INITIAL_HOLDINGS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy & Conglomerate',
    quantity: 25,
    avgBuyPrice: toSubunits(2840.00), // 284000 paise
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    sector: 'IT Services & Consulting',
    quantity: 15,
    avgBuyPrice: toSubunits(3750.00), // 375000 paise
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financial Services',
    quantity: 40,
    avgBuyPrice: toSubunits(1620.00), // 162000 paise
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    sector: 'IT Services & Consulting',
    quantity: 35,
    avgBuyPrice: toSubunits(1480.00), // 148000 paise
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd.',
    sector: 'Consumer Internet & Logistics',
    quantity: 250,
    avgBuyPrice: toSubunits(192.50), // 19250 paise
  },
];

export const PortfolioProvider = ({ children }) => {
  // Default cash balance: ₹2,50,000 (2,50,00,000 paise)
  const [cashBalance, setCashBalance] = useState(() => toSubunits(250000));
  const [holdings, setHoldings] = useState(INITIAL_HOLDINGS);
  const [transactions, setTransactions] = useState([]);
  const [isSyncedWithBackend, setIsSyncedWithBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Initialize live prices map from active catalog
  const [livePrices, setLivePrices] = useState(() => {
    const initial = {};
    for (const inst of MARKET_INSTRUMENTS) {
      initial[inst.symbol] = {
        price: inst.basePrice,
        change24h: inst.change24h,
        lastDelta: 0,
        timestamp: Date.now(),
      };
    }
    return initial;
  });

  // Mutable buffer & animation frame reference for tick batching
  const tickBufferRef = useRef({});
  const rafIdRef = useRef(null);

  const flushBuffer = useCallback(() => {
    rafIdRef.current = null;
    const buffered = tickBufferRef.current;
    tickBufferRef.current = {};

    const symbols = Object.keys(buffered);
    if (symbols.length === 0) return;

    setLivePrices((prev) => {
      const next = { ...prev };
      for (const sym of symbols) {
        next[sym] = buffered[sym];
      }
      return next;
    });
  }, []);

  const queueTick = useCallback(
    (tick) => {
      tickBufferRef.current[tick.symbol] = tick;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushBuffer);
      }
    },
    [flushBuffer]
  );

  // Subscribe to market price tick stream
  useEffect(() => {
    const unsubscribe = createMarketTickStream((tick) => {
      queueTick(tick);
    });

    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [queueTick]);

  // Sync initial portfolio & transaction history on mount
  useEffect(() => {
    let isMounted = true;

    const initSync = async () => {
      try {
        const data = await fetchPortfolio();
        if (isMounted && data.success && data.portfolio) {
          setCashBalance(data.portfolio.cashBalancePaise);
          setHoldings(
            data.portfolio.positions.map((p) => ({
              symbol: p.symbol,
              name: p.name,
              sector: p.sector,
              quantity: p.quantity,
              avgBuyPrice: p.avgBuyPricePaise,
            }))
          );
          if (Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          }
          setIsSyncedWithBackend(true);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || 'Server offline or pending database connectivity');
          setIsSyncedWithBackend(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSync();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual refresh action callable by user
  const refreshPortfolio = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchPortfolio();
      if (data.success && data.portfolio) {
        setCashBalance(data.portfolio.cashBalancePaise);
        setHoldings(
          data.portfolio.positions.map((p) => ({
            symbol: p.symbol,
            name: p.name,
            sector: p.sector,
            quantity: p.quantity,
            avgBuyPrice: p.avgBuyPricePaise,
          }))
        );
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
        setIsSyncedWithBackend(true);
      }
    } catch (err) {
      setFetchError(err.message || 'Server offline or pending database connectivity');
      setIsSyncedWithBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Action: Manual single price update
  const updateLivePrice = useCallback(
    (tick) => {
      queueTick(tick);
    },
    [queueTick]
  );

  // Action: Execute BUY or SELL trade with Optimistic UI & Server Sync
  const executeTrade = useCallback(
    async ({ symbol, name, sector, type, quantity, pricePerUnit }) => {
      const qty = parseInt(quantity, 10);
      const unitPrice = Math.round(Number(pricePerUnit));

      if (isNaN(qty) || qty <= 0) {
        return { success: false, error: 'Please enter a valid positive quantity' };
      }
      if (isNaN(unitPrice) || unitPrice <= 0) {
        return { success: false, error: 'Invalid execution price' };
      }

      const totalCostSubunits = qty * unitPrice;

      // Pre-execution business rule checks
      if (type === 'BUY' && cashBalance < totalCostSubunits) {
        return {
          success: false,
          error: `Insufficient cash balance. Required: ${formatINRFromSubunits(
            totalCostSubunits
          )}, Available: ${formatINRFromSubunits(cashBalance)}`,
        };
      }

      const existingHolding = holdings.find((h) => h.symbol === symbol);
      if (type === 'SELL' && (!existingHolding || existingHolding.quantity < qty)) {
        const available = existingHolding ? existingHolding.quantity : 0;
        return {
          success: false,
          error: `Cannot sell ${qty} shares. Available position: ${available} shares`,
        };
      }

      // 1. Generate unique idempotency key
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `TX-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 2. Snapshot previous state for rollback on server failure
      const prevCash = cashBalance;
      const prevHoldings = [...holdings];
      const prevTransactions = [...transactions];

      // 3. Apply Optimistic UI update
      const optimisticTx = {
        id: idempotencyKey,
        idempotencyKey,
        symbol,
        type,
        quantity: qty,
        executionPricePaise: unitPrice,
        pricePerUnit: unitPrice,
        totalAmount: totalCostSubunits,
        totalValuePaise: totalCostSubunits,
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      };

      if (type === 'BUY') {
        setCashBalance((prev) => prev - totalCostSubunits);
        setHoldings((prev) => {
          const index = prev.findIndex((h) => h.symbol === symbol);
          if (index >= 0) {
            const existing = prev[index];
            const newQty = existing.quantity + qty;
            const newAvgBuyPrice = Math.round(
              (existing.avgBuyPrice * existing.quantity + totalCostSubunits) / newQty
            );
            const updated = [...prev];
            updated[index] = {
              ...existing,
              quantity: newQty,
              avgBuyPrice: newAvgBuyPrice,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                symbol,
                name: name || symbol,
                sector: sector || 'Diversified',
                quantity: qty,
                avgBuyPrice: unitPrice,
              },
            ];
          }
        });
      } else if (type === 'SELL') {
        setCashBalance((prev) => prev + totalCostSubunits);
        setHoldings((prev) =>
          prev
            .map((h) => {
              if (h.symbol === symbol) {
                const remaining = h.quantity - qty;
                return remaining > 0 ? { ...h, quantity: remaining } : null;
              }
              return h;
            })
            .filter(Boolean)
        );
      }

      setTransactions((prev) => [optimisticTx, ...prev]);

      // 4. Submit to Express backend API with Idempotency Key
      try {
        const response = await executeTradeApi({
          idempotencyKey,
          symbol,
          name: name || symbol,
          sector: sector || 'Diversified',
          type,
          quantity: qty,
          pricePaise: unitPrice,
        });

        // If backend returns updated portfolio state, sync authority state
        if (response.success && response.portfolio) {
          setCashBalance(response.portfolio.cashBalancePaise);
          setHoldings(
            response.portfolio.positions.map((p) => ({
              symbol: p.symbol,
              name: p.name,
              sector: p.sector,
              quantity: p.quantity,
              avgBuyPrice: p.avgBuyPricePaise,
            }))
          );
          if (response.transaction) {
            setTransactions((prev) => [
              response.transaction,
              ...prev.filter((t) => t.idempotencyKey !== idempotencyKey),
            ]);
          }
          setIsSyncedWithBackend(true);
        }

        return { success: true, transaction: response.transaction || optimisticTx };
      } catch (err) {
        // If server actively rejected with business validation (e.g. 400), rollback
        if (err.status === 400) {
          setCashBalance(prevCash);
          setHoldings(prevHoldings);
          setTransactions(prevTransactions);
          return { success: false, error: err.message || 'Order rejected by server' };
        }

        // If backend is offline or 503 (pending Atlas URI), keep optimistic client state
        return {
          success: true,
          transaction: optimisticTx,
          offlineNotice: 'Executed in client fallback mode (backend offline / pending DB)',
        };
      }
    },
    [cashBalance, holdings, transactions]
  );

  // Derived dynamic calculations computed purely & immutably
  const portfolioSummary = useMemo(() => {
    const computedHoldings = holdings.map((h) => {
      const live = livePrices[h.symbol];
      const currentPriceSubunits = live ? live.price : h.avgBuyPrice;
      const change24h = live ? live.change24h : 0;
      const lastDelta = live ? live.lastDelta : 0;

      const pnl = calculatePnL(h.avgBuyPrice, currentPriceSubunits, h.quantity);
      const dayDelta = Math.round(pnl.currentSubunits * (change24h / 100));

      return {
        ...h,
        currentPriceSubunits,
        currentPriceRupees: fromSubunits(currentPriceSubunits),
        formattedCurrentPrice: formatINRFromSubunits(currentPriceSubunits),
        change24h,
        lastDelta,
        dayDelta,
        ...pnl,
      };
    });

    const totalInvestedSubunits = computedHoldings.reduce((sum, h) => sum + h.investedSubunits, 0);
    const totalCurrentSubunits = computedHoldings.reduce((sum, h) => sum + h.currentSubunits, 0);
    const totalDayChangeSubunits = computedHoldings.reduce((sum, h) => sum + h.dayDelta, 0);

    const totalPortfolioValueSubunits = cashBalance + totalCurrentSubunits;
    const totalUnrealizedPnLSubunits = totalCurrentSubunits - totalInvestedSubunits;
    const totalUnrealizedPnLPercent =
      totalInvestedSubunits > 0
        ? (totalUnrealizedPnLSubunits / totalInvestedSubunits) * 100
        : 0;

    const dayChangePercent =
      totalCurrentSubunits > 0
        ? (totalDayChangeSubunits / totalCurrentSubunits) * 100
        : 0;

    // Attach allocation weight to each computed holding
    const holdingsWithAllocation = computedHoldings.map((item) => {
      const allocationPercent =
        totalCurrentSubunits > 0
          ? ((item.currentSubunits / totalCurrentSubunits) * 100).toFixed(1)
          : '0.0';
      return {
        ...item,
        allocationPercent: `${allocationPercent}%`,
        weightNumeric: parseFloat(allocationPercent),
      };
    });

    return {
      cashBalanceSubunits: cashBalance,
      cashBalanceRupees: fromSubunits(cashBalance),
      formattedCashBalance: formatINRFromSubunits(cashBalance),

      totalInvestedSubunits,
      totalInvestedRupees: fromSubunits(totalInvestedSubunits),
      formattedTotalInvested: formatINRFromSubunits(totalInvestedSubunits),

      totalCurrentHoldingsSubunits: totalCurrentSubunits,
      totalCurrentHoldingsRupees: fromSubunits(totalCurrentSubunits),
      formattedHoldingsValue: formatINRFromSubunits(totalCurrentSubunits),

      totalPortfolioValueSubunits,
      totalPortfolioValueRupees: fromSubunits(totalPortfolioValueSubunits),
      formattedTotalPortfolioValue: formatINRFromSubunits(totalPortfolioValueSubunits),

      unrealizedPnLSubunits: totalUnrealizedPnLSubunits,
      unrealizedPnLRupees: fromSubunits(totalUnrealizedPnLSubunits),
      formattedUnrealizedPnL: `${totalUnrealizedPnLSubunits >= 0 ? '+' : ''}${formatINRFromSubunits(
        totalUnrealizedPnLSubunits
      )}`,
      unrealizedPnLPercent: totalUnrealizedPnLPercent,
      formattedUnrealizedPnLPercent: `${totalUnrealizedPnLPercent >= 0 ? '+' : ''}${totalUnrealizedPnLPercent.toFixed(
        2
      )}%`,
      isPnLPositive: totalUnrealizedPnLSubunits >= 0,

      dayChangeSubunits: totalDayChangeSubunits,
      dayChangeRupees: fromSubunits(totalDayChangeSubunits),
      formattedDayChange: `${totalDayChangeSubunits >= 0 ? '+' : ''}${formatINRFromSubunits(
        totalDayChangeSubunits
      )}`,
      dayChangePercent,
      formattedDayChangePercent: `${dayChangePercent >= 0 ? '+' : ''}${dayChangePercent.toFixed(2)}%`,
      isDayPositive: totalDayChangeSubunits >= 0,

      holdings: holdingsWithAllocation,
    };
  }, [holdings, livePrices, cashBalance]);

  const value = {
    cashBalance,
    holdings,
    livePrices,
    transactions,
    isSyncedWithBackend,
    isLoading,
    fetchError,
    refreshPortfolio,
    portfolioSummary,
    updateLivePrice,
    executeTrade,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};
