/**
 * WealthOS Portfolio Analytics Mathematical Engine
 *
 * Core mathematical functions for returns, allocation breakdown, and concentration analysis.
 * All financial arithmetic is performed in integer subunits (paise, Scale 100).
 * Never compute from formatted currency display strings.
 */

/**
 * Calculates realized/unrealized return metrics with safe denominator handling.
 *
 * @param {Object} params
 * @param {number} params.investedSubunits - Total invested cost basis in integer paise
 * @param {number} params.currentSubunits - Total current valuation in integer paise
 * @returns {Object} Computed returns breakdown
 */
export function calculateReturns({ investedSubunits = 0, currentSubunits = 0 } = {}) {
  const invested = Math.max(0, Math.round(Number(investedSubunits) || 0));
  const current = Math.max(0, Math.round(Number(currentSubunits) || 0));
  const pnlSubunits = current - invested;

  // Safe denominator: return 0 if no capital invested to prevent division by zero or NaN
  let returnPercent = 0;
  if (invested > 0) {
    returnPercent = Number(((pnlSubunits / invested) * 100).toFixed(2));
  }

  return {
    investedSubunits: invested,
    currentSubunits: current,
    pnlSubunits,
    returnPercent,
    isPositive: pnlSubunits >= 0,
    hasInvestedCapital: invested > 0,
  };
}

/**
 * Calculates instrument and sector allocations, distinguishing holdings allocation
 * from total portfolio allocation (which includes uninvested cash).
 *
 * @param {Array} holdings - Array of holding position objects
 * @param {number} cashBalanceSubunits - Uninvested cash balance in integer paise
 * @returns {Object} Structured allocation breakdowns and aggregate totals
 */
export function calculateAllocations(holdings = [], cashBalanceSubunits = 0) {
  const safeCash = Math.max(0, Math.round(Number(cashBalanceSubunits) || 0));

  // Compute total value of held instruments
  let totalHoldingsSubunits = 0;
  const sanitizedHoldings = (Array.isArray(holdings) ? holdings : []).map((h) => {
    const qty = Math.max(0, Number(h.quantity) || 0);
    // Prefer explicitly provided currentSubunits; fallback to quantity * price
    const currentSubunits =
      typeof h.currentSubunits === 'number'
        ? Math.max(0, Math.round(h.currentSubunits))
        : Math.round(qty * Number(h.currentPriceSubunits || h.avgBuyPrice || 0));

    totalHoldingsSubunits += currentSubunits;

    return {
      symbol: h.symbol || 'UNKNOWN',
      name: h.name || h.symbol || 'Unknown Instrument',
      sector: h.sector || 'Unclassified',
      quantity: qty,
      currentSubunits,
    };
  });

  const totalPortfolioSubunits = totalHoldingsSubunits + safeCash;

  // 1. Instrument Allocations
  const instrumentAllocations = sanitizedHoldings
    .map((item) => {
      const holdingsPercent =
        totalHoldingsSubunits > 0
          ? Number(((item.currentSubunits / totalHoldingsSubunits) * 100).toFixed(2))
          : 0;

      const portfolioPercent =
        totalPortfolioSubunits > 0
          ? Number(((item.currentSubunits / totalPortfolioSubunits) * 100).toFixed(2))
          : 0;

      return {
        ...item,
        holdingsPercent,
        portfolioPercent,
      };
    })
    .sort((a, b) => b.currentSubunits - a.currentSubunits);

  // 2. Sector Allocations
  const sectorMap = {};
  for (const item of sanitizedHoldings) {
    const sec = item.sector;
    if (!sectorMap[sec]) {
      sectorMap[sec] = {
        sector: sec,
        currentSubunits: 0,
        positionCount: 0,
      };
    }
    sectorMap[sec].currentSubunits += item.currentSubunits;
    sectorMap[sec].positionCount += 1;
  }

  const sectorAllocations = Object.values(sectorMap)
    .map((sec) => {
      const holdingsPercent =
        totalHoldingsSubunits > 0
          ? Number(((sec.currentSubunits / totalHoldingsSubunits) * 100).toFixed(2))
          : 0;

      const portfolioPercent =
        totalPortfolioSubunits > 0
          ? Number(((sec.currentSubunits / totalPortfolioSubunits) * 100).toFixed(2))
          : 0;

      return {
        ...sec,
        holdingsPercent,
        portfolioPercent,
      };
    })
    .sort((a, b) => b.currentSubunits - a.currentSubunits);

  // Cash allocation relative to total net worth
  const cashAllocationPercent =
    totalPortfolioSubunits > 0
      ? Number(((safeCash / totalPortfolioSubunits) * 100).toFixed(2))
      : 0;

  return {
    totalHoldingsSubunits,
    totalPortfolioSubunits,
    cashSubunits: safeCash,
    cashAllocationPercent,
    instrumentAllocations,
    sectorAllocations,
    holdingsCount: sanitizedHoldings.length,
    sectorCount: sectorAllocations.length,
  };
}

/**
 * Computes portfolio concentration metrics (Largest holding, Top-3, Top-5, HHI).
 * Explicitly scoped as concentration distributions, NOT an empirical multi-factor risk model.
 *
 * @param {Array} holdings - Array of holding position objects
 * @param {number} cashBalanceSubunits - Uninvested cash balance in integer paise
 * @returns {Object} Concentration statistics
 */
export function calculateConcentrationMetrics(holdings = [], cashBalanceSubunits = 0) {
  const allocation = calculateAllocations(holdings, cashBalanceSubunits);
  const { instrumentAllocations, sectorAllocations, totalHoldingsSubunits, totalPortfolioSubunits } =
    allocation;

  if (instrumentAllocations.length === 0 || totalHoldingsSubunits === 0) {
    return {
      largestPosition: null,
      largestHoldingPercent: 0,
      largestPortfolioPercent: 0,
      top3ConcentrationPercent: 0,
      top5ConcentrationPercent: 0,
      largestSector: null,
      herfindahlIndex: 0,
      concentrationLevel: 'NONE',
      totalHoldingsSubunits: 0,
      totalPortfolioSubunits,
      hasPositions: false,
    };
  }

  const largestPosition = instrumentAllocations[0];

  // Top 3 Concentration (CR3)
  const top3Sum = instrumentAllocations
    .slice(0, 3)
    .reduce((sum, item) => sum + item.holdingsPercent, 0);
  const top3ConcentrationPercent = Number(Math.min(100, top3Sum).toFixed(2));

  // Top 5 Concentration (CR5)
  const top5Sum = instrumentAllocations
    .slice(0, 5)
    .reduce((sum, item) => sum + item.holdingsPercent, 0);
  const top5ConcentrationPercent = Number(Math.min(100, top5Sum).toFixed(2));

  // Largest Sector
  const largestSector = sectorAllocations.length > 0 ? sectorAllocations[0] : null;

  // Herfindahl-Hirschman Index (HHI) for holdings: sum of squared percentage weights (0 to 10,000)
  const herfindahlIndex = Math.round(
    instrumentAllocations.reduce((acc, item) => acc + Math.pow(item.holdingsPercent, 2), 0)
  );

  // Qualitative classification based on institutional thresholds
  let concentrationLevel = 'DIVERSIFIED';
  if (herfindahlIndex >= 2500 || largestPosition.holdingsPercent >= 40) {
    concentrationLevel = 'HIGH';
  } else if (herfindahlIndex >= 1500 || largestPosition.holdingsPercent >= 25) {
    concentrationLevel = 'MODERATE';
  }

  return {
    largestPosition: {
      symbol: largestPosition.symbol,
      name: largestPosition.name,
      sector: largestPosition.sector,
      currentSubunits: largestPosition.currentSubunits,
      holdingsPercent: largestPosition.holdingsPercent,
      portfolioPercent: largestPosition.portfolioPercent,
    },
    largestHoldingPercent: largestPosition.holdingsPercent,
    largestPortfolioPercent: largestPosition.portfolioPercent,
    top3ConcentrationPercent,
    top5ConcentrationPercent,
    largestSector: largestSector
      ? {
          sector: largestSector.sector,
          currentSubunits: largestSector.currentSubunits,
          holdingsPercent: largestSector.holdingsPercent,
          portfolioPercent: largestSector.portfolioPercent,
          positionCount: largestSector.positionCount,
        }
      : null,
    herfindahlIndex,
    concentrationLevel,
    totalHoldingsSubunits,
    totalPortfolioSubunits,
    hasPositions: true,
  };
}

/**
 * Returns illustrative performance trajectory data when historical snapshots do not exist.
 * Explicitly marks simulation flags and disclosures.
 *
 * @param {number} currentTotalRupees - Current portfolio total net worth in rupees
 * @returns {Object} Series data, simulation status, and institutional disclaimer
 */
export function getPerformanceSeries(currentTotalRupees = 500000) {
  const base = Math.max(1000, Number(currentTotalRupees) || 500000);

  // Scaled 30-day illustrative curve normalized around current valuation
  const points = [
    { date: 'Day 1', factor: 0.92, benchmarkFactor: 0.94 },
    { date: 'Day 5', factor: 0.935, benchmarkFactor: 0.95 },
    { date: 'Day 10', factor: 0.915, benchmarkFactor: 0.945 },
    { date: 'Day 15', factor: 0.95, benchmarkFactor: 0.96 },
    { date: 'Day 20', factor: 0.97, benchmarkFactor: 0.975 },
    { date: 'Day 25', factor: 0.985, benchmarkFactor: 0.99 },
    { date: 'Today', factor: 1.0, benchmarkFactor: 1.0 },
  ];

  const series = points.map((p) => ({
    date: p.date,
    portfolio: Math.round(base * p.factor),
    benchmark: Math.round(base * p.benchmarkFactor),
  }));

  return {
    isHistoricalPersisted: false,
    isSimulated: true,
    benchmarkName: 'Nifty 50 (Simulated)',
    benchmarkAvailable: false,
    series,
    disclosure:
      'Notice: Historical portfolio NAV series and Nifty 50 index prices are illustrative simulations. WealthOS currently persists atomic transaction ledgers, but daily EOD valuation snapshots have not yet been recorded in the database.',
  };
}

/**
 * Formats persisted historical snapshots for charting in Recharts.
 *
 * @param {Array} snapshots - Array of snapshot documents from MongoDB
 * @returns {{
 *   hasHistory: boolean,
 *   isPersisted: boolean,
 *   count: number,
 *   series: Array<{
 *     date: string,
 *     valuationDate: string,
 *     portfolio: number,
 *     cash: number,
 *     holdings: number,
 *     isSimulated: boolean
 *   }>
 * }}
 */
export function formatSnapshotChartData(snapshots = []) {
  const list = Array.isArray(snapshots) ? snapshots : [];

  if (list.length === 0) {
    return {
      hasHistory: false,
      isPersisted: true,
      count: 0,
      series: [],
    };
  }

  // Sort chronologically ascending by valuationDate
  const sorted = [...list].sort((a, b) =>
    (a.valuationDate || '').localeCompare(b.valuationDate || '')
  );

  const series = sorted.map((snap) => {
    let displayDate = snap.valuationDate;
    try {
      const parts = (snap.valuationDate || '').split('-');
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10)
        );
        displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
    } catch {
      displayDate = snap.valuationDate;
    }

    const portfolioRupees = Math.round((snap.totalPortfolioValuePaise || 0) / 100);
    const cashRupees = Math.round((snap.cashBalancePaise || 0) / 100);
    const holdingsRupees = Math.round((snap.holdingsMarketValuePaise || 0) / 100);

    return {
      date: displayDate,
      valuationDate: snap.valuationDate,
      portfolio: portfolioRupees,
      cash: cashRupees,
      holdings: holdingsRupees,
      isSimulated: snap.isSimulated ?? true,
    };
  });

  return {
    hasHistory: series.length >= 2,
    isPersisted: true,
    count: series.length,
    series,
  };
}

