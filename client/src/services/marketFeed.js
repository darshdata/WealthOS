/**
 * WEALTHOS MARKET SIMULATION & FEED SERVICE
 * 
 * Provides simulated streaming ticks, instrument catalog, and debounced
 * cancellable instrument searches using AbortController.
 */

import { toSubunits } from '../utils/currency';

/**
 * Market instrument catalog.
 * Base prices stored in integer paise (subunits).
 */
export const MARKET_INSTRUMENTS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy & Conglomerate',
    basePrice: toSubunits(2940.50), // 294050 paise
    change24h: 1.42,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    sector: 'IT Services & Consulting',
    basePrice: toSubunits(3890.00), // 389000 paise
    change24h: -0.65,
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financial Services',
    basePrice: toSubunits(1680.25), // 168025 paise
    change24h: 0.85,
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    sector: 'IT Services & Consulting',
    basePrice: toSubunits(1520.75), // 152075 paise
    change24h: 1.15,
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd.',
    sector: 'Consumer Internet & Logistics',
    basePrice: toSubunits(215.40), // 21540 paise
    change24h: 3.80,
  },
  {
    symbol: 'PAYTM',
    name: 'One97 Communications Ltd. (Paytm)',
    sector: 'FinTech & Digital Payments',
    basePrice: toSubunits(425.80), // 42580 paise
    change24h: -1.20,
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    sector: 'Automobile & EV',
    basePrice: toSubunits(965.10), // 96510 paise
    change24h: 2.10,
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    sector: 'Banking & Financial Services',
    basePrice: toSubunits(1235.60), // 123560 paise
    change24h: 0.95,
  },
];

/**
 * Searches instruments with simulated network latency and AbortSignal support.
 * 
 * @param {string} query - Keyword for symbol, name, or sector
 * @param {AbortSignal} [abortSignal] - Signal to abort in-flight queries
 * @returns {Promise<Array>} Matching instruments
 */
export const searchMarketInstruments = (query, abortSignal) => {
  return new Promise((resolve, reject) => {
    // Immediate pre-check
    if (abortSignal?.aborted) {
      return reject(new DOMException('Query aborted by user', 'AbortError'));
    }

    const timer = setTimeout(() => {
      if (abortSignal?.aborted) {
        return reject(new DOMException('Query aborted by user', 'AbortError'));
      }

      const q = (query || '').trim().toLowerCase();
      if (!q) {
        return resolve([]);
      }

      const matches = MARKET_INSTRUMENTS.filter((item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q)
      );

      resolve(matches);
    }, 250); // 250ms simulated async search latency

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Query aborted by user', 'AbortError'));
      }, { once: true });
    }
  });
};

/**
 * Creates a streaming market price ticker.
 * Generates continuous randomized price movements with 800ms - 1200ms intervals.
 * 
 * @param {Function} onTick - Callback invoked on each price tick with { symbol, price, change24h, lastDelta, timestamp }
 * @returns {Function} Cleanup function to unsubscribe from the feed
 */
export const createMarketTickStream = (onTick) => {
  let isActive = true;
  let timerId = null;

  // Track mutable state of active prices in paise
  const dynamicPrices = new Map(
    MARKET_INSTRUMENTS.map((inst) => [
      inst.symbol,
      {
        price: inst.basePrice,
        basePrice: inst.basePrice,
        change24h: inst.change24h,
      },
    ])
  );

  const scheduleNextTick = () => {
    if (!isActive) return;

    // Random interval between 800ms and 1200ms
    const delay = Math.floor(Math.random() * 400) + 800;

    timerId = setTimeout(() => {
      if (!isActive) return;

      // Pick a random instrument from the catalog
      const randomIndex = Math.floor(Math.random() * MARKET_INSTRUMENTS.length);
      const instrument = MARKET_INSTRUMENTS[randomIndex];
      const current = dynamicPrices.get(instrument.symbol);

      if (current) {
        // Delta between -0.4% and +0.4% per tick (or minimum ±10 paise)
        const pctDelta = (Math.random() * 0.8 - 0.4) / 100;
        let deltaPaise = Math.round(current.price * pctDelta);
        if (deltaPaise === 0) {
          deltaPaise = Math.random() > 0.5 ? 25 : -25;
        }

        const newPrice = Math.max(toSubunits(1), current.price + deltaPaise);
        const totalDeltaFromBase = newPrice - current.basePrice;
        const newChange24h = Number(
          (instrument.change24h + (totalDeltaFromBase / current.basePrice) * 100).toFixed(2)
        );

        // Update tracking map
        current.price = newPrice;
        current.change24h = newChange24h;

        // Dispatch tick payload
        onTick({
          symbol: instrument.symbol,
          price: newPrice, // integer paise
          change24h: newChange24h,
          lastDelta: deltaPaise,
          timestamp: Date.now(),
        });
      }

      scheduleNextTick();
    }, delay);
  };

  scheduleNextTick();

  return () => {
    isActive = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
};
