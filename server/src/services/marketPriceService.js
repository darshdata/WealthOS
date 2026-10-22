/**
 * WEALTHOS SERVER-SIDE SIMULATED PRICE SERVICE
 *
 * NOTE: This is a clearly labelled simulated paper-trading price service.
 * In this sandbox environment, simulated prices are maintained server-side to provide
 * consistent, tamper-proof valuations for trade execution and daily portfolio snapshots.
 *
 * THESE ARE NOT REAL-TIME NSE/BSE EXCHANGE QUOTES.
 */

// Calibrated base prices in integer paise (Scale 100: ₹1.00 = 100 paise)
export const SERVER_MARKET_CATALOG = {
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy & Conglomerate',
    basePricePaise: 294050, // ₹2,940.50
  },
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    sector: 'IT Services & Consulting',
    basePricePaise: 389000, // ₹3,890.00
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financial Services',
    basePricePaise: 168025, // ₹1,680.25
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    sector: 'IT Services & Consulting',
    basePricePaise: 152075, // ₹1,520.75
  },
  ZOMATO: {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd.',
    sector: 'Consumer Internet & Logistics',
    basePricePaise: 21540, // ₹215.40
  },
  PAYTM: {
    symbol: 'PAYTM',
    name: 'One97 Communications Ltd. (Paytm)',
    sector: 'FinTech & Digital Payments',
    basePricePaise: 42580, // ₹425.80
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    sector: 'Automobile & EV',
    basePricePaise: 96510, // ₹965.10
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    sector: 'Banking & Financial Services',
    basePricePaise: 123560, // ₹1,235.60
  },
};

/**
 * In-memory server price store for paper trading.
 * Initialized with base prices; can be updated deterministically in tests.
 */
const dynamicServerPrices = new Map(
  Object.entries(SERVER_MARKET_CATALOG).map(([sym, item]) => [
    sym,
    {
      pricePaise: item.basePricePaise,
      updatedAt: new Date(),
    },
  ])
);

/**
 * Returns the current server-side simulated price for an instrument.
 *
 * @param {string} symbol - Instrument symbol (e.g., 'RELIANCE')
 * @returns {{ symbol: string, pricePaise: number, isSimulated: boolean, updatedAt: Date }}
 */
export const getServerMarketPrice = (symbol) => {
  const sym = (symbol || '').toUpperCase().trim();
  const entry = dynamicServerPrices.get(sym);

  if (entry) {
    return {
      symbol: sym,
      pricePaise: entry.pricePaise,
      isSimulated: true,
      priceSource: 'SERVER_SIMULATED',
      updatedAt: entry.updatedAt,
    };
  }

  const catalogItem = SERVER_MARKET_CATALOG[sym];
  if (catalogItem) {
    return {
      symbol: sym,
      pricePaise: catalogItem.basePricePaise,
      isSimulated: true,
      priceSource: 'SERVER_SIMULATED',
      updatedAt: new Date(),
    };
  }

  throw new Error(`Unsupported instrument symbol: '${symbol}'. Not found in market catalog.`);
};

/**
 * Sets a deterministic price for testing or administrative simulation updates.
 *
 * @param {string} symbol
 * @param {number} pricePaise - Positive integer paise
 */
export const setServerMarketPrice = (symbol, pricePaise) => {
  const sym = (symbol || '').toUpperCase().trim();
  if (!SERVER_MARKET_CATALOG[sym]) {
    throw new Error(`Cannot set price for unsupported instrument '${symbol}'`);
  }
  const cleanPaise = Math.round(Number(pricePaise));
  if (cleanPaise <= 0) {
    throw new Error('Price must be a positive integer in paise');
  }

  dynamicServerPrices.set(sym, {
    pricePaise: cleanPaise,
    updatedAt: new Date(),
  });
};

/**
 * Resets all server-side prices to default catalog base prices.
 */
export const resetServerMarketPrices = () => {
  for (const [sym, item] of Object.entries(SERVER_MARKET_CATALOG)) {
    dynamicServerPrices.set(sym, {
      pricePaise: item.basePricePaise,
      updatedAt: new Date(),
    });
  }
};

/**
 * Calculates current market value of an array of portfolio positions using server-side prices.
 *
 * @param {Array<{ symbol: string, quantity: number, avgBuyPricePaise: number }>} positions
 * @returns {{
 *   totalHoldingsValuePaise: number,
 *   positionBreakdown: Array<{
 *     symbol: string,
 *     name: string,
 *     sector: string,
 *     quantity: number,
 *     avgBuyPricePaise: number,
 *     marketPricePaise: number,
 *     marketValuePaise: number
 *   }>
 * }}
 */
export const calculateHoldingsMarketValue = (positions = []) => {
  let totalHoldingsValuePaise = 0;

  const positionBreakdown = (Array.isArray(positions) ? positions : []).map((pos) => {
    const sym = (pos.symbol || '').toUpperCase().trim();
    const qty = Math.max(0, Math.floor(Number(pos.quantity) || 0));

    let pricePaise = 0;
    try {
      pricePaise = getServerMarketPrice(sym).pricePaise;
    } catch {
      pricePaise = Math.max(0, Math.round(Number(pos.avgBuyPricePaise) || 0));
    }

    const marketValuePaise = Math.round(qty * pricePaise);
    totalHoldingsValuePaise += marketValuePaise;

    const catalog = SERVER_MARKET_CATALOG[sym] || {};

    return {
      symbol: sym,
      name: pos.name || catalog.name || sym,
      sector: pos.sector || catalog.sector || 'Diversified',
      quantity: qty,
      avgBuyPricePaise: Math.max(0, Math.round(Number(pos.avgBuyPricePaise) || 0)),
      marketPricePaise: pricePaise,
      marketValuePaise,
    };
  });

  return {
    totalHoldingsValuePaise,
    positionBreakdown,
  };
};
