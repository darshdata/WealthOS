/**
 * WEALTHOS DAILY PORTFOLIO SNAPSHOT SERVICE
 *
 * Implements safe, idempotent daily portfolio valuation snapshots.
 * Timezone: Asia/Kolkata (IST).
 * Idempotency: Uses unique compound index { userId: 1, valuationDate: 1 } with upsert logic.
 */

import Portfolio from '../models/Portfolio.js';
import PortfolioSnapshot from '../models/PortfolioSnapshot.js';
import { calculateHoldingsMarketValue } from './marketPriceService.js';

// Module-level singleton guard to prevent duplicate scheduler intervals on reloads
let schedulerTimer = null;

/**
 * Returns formatted YYYY-MM-DD date string in Asia/Kolkata timezone.
 *
 * @param {Date|number} [date=new Date()]
 * @returns {string} Formatted date (e.g. '2026-10-22')
 */
export const getKolkataDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Creates or idempotently updates a daily snapshot for a specific user.
 *
 * @param {string} userId - User identifier (e.g., 'demo-user')
 * @param {Object} [options]
 * @param {string} [options.valuationDate] - Explicit YYYY-MM-DD (defaults to current date in Asia/Kolkata)
 * @param {Date} [options.valuationTimestamp] - Exact timestamp (defaults to Date.now())
 * @param {string} [options.notes] - Operational notes
 * @returns {Promise<PortfolioSnapshot>} The persisted snapshot document
 */
export const createDailySnapshotForUser = async (userId, options = {}) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId string is required for snapshot creation');
  }

  const valuationTimestamp = options.valuationTimestamp instanceof Date
    ? options.valuationTimestamp
    : new Date();
  const valuationDate = options.valuationDate || getKolkataDateString(valuationTimestamp);

  // 1. Fetch current portfolio
  const portfolio = await Portfolio.findOne({ userId });
  if (!portfolio) {
    throw new Error(`Portfolio not found for user: '${userId}'`);
  }

  // 2. Compute holdings valuation using server simulated price service
  const { totalHoldingsValuePaise, positionBreakdown } = calculateHoldingsMarketValue(
    portfolio.positions
  );

  const cashBalancePaise = Math.max(0, Math.round(Number(portfolio.cashBalancePaise) || 0));
  const totalPortfolioValuePaise = cashBalancePaise + totalHoldingsValuePaise;

  const snapshotPayload = {
    userId,
    valuationDate,
    valuationTimestamp,
    cashBalancePaise,
    holdingsMarketValuePaise: totalHoldingsValuePaise,
    totalPortfolioValuePaise,
    priceSource: 'SERVER_SIMULATED',
    isSimulated: true,
    positionsSnapshot: positionBreakdown,
    metadata: {
      schemaVersion: 1,
      timezone: 'Asia/Kolkata',
      positionsCount: positionBreakdown.length,
      notes: options.notes || 'Automated daily portfolio valuation snapshot',
    },
  };

  // 3. Upsert snapshot: guaranteed idempotent on (userId, valuationDate)
  const snapshot = await PortfolioSnapshot.findOneAndUpdate(
    { userId, valuationDate },
    { $set: snapshotPayload },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return snapshot;
};

/**
 * Creates daily valuation snapshots for all users with active portfolios.
 *
 * @returns {Promise<{ processed: number, successes: number, failures: number, results: Array }>}
 */
export const createDailySnapshotsForAllUsers = async () => {
  const portfolios = await Portfolio.find({}, { userId: 1 }).lean();
  let successes = 0;
  let failures = 0;
  const results = [];

  for (const p of portfolios) {
    try {
      const snap = await createDailySnapshotForUser(p.userId);
      successes++;
      results.push({ userId: p.userId, success: true, valuationDate: snap.valuationDate });
    } catch (err) {
      failures++;
      console.error(`[Snapshot Service Error] Failed snapshot for user '${p.userId}':`, err.message);
      results.push({ userId: p.userId, success: false, error: err.message });
    }
  }

  return {
    processed: portfolios.length,
    successes,
    failures,
    results,
  };
};

/**
 * Seeds a historical sequence of daily snapshots for development, testing, and initial analytics.
 *
 * @param {string} userId - Target user identifier
 * @param {number} [days=14] - Number of consecutive historical days to generate
 * @returns {Promise<Array<PortfolioSnapshot>>} Array of created snapshots
 */
export const seedHistoricalSnapshotsForUser = async (userId, days = 14) => {
  const portfolio = await Portfolio.findOne({ userId });
  if (!portfolio) {
    throw new Error(`Cannot seed history: Portfolio not found for user '${userId}'`);
  }

  const { totalHoldingsValuePaise, positionBreakdown } = calculateHoldingsMarketValue(
    portfolio.positions
  );
  const baseCash = portfolio.cashBalancePaise;
  const baseHoldings = totalHoldingsValuePaise;

  const created = [];
  const now = new Date();

  // Create trajectory for past N days ending yesterday
  for (let i = days; i >= 1; i--) {
    const historicalDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = getKolkataDateString(historicalDate);

    // Controlled deterministic variation: ±3% drift to reflect historical market movement
    const varianceFactor = 1 - (i * 0.006) + (Math.sin(i) * 0.015);
    const simulatedHoldingsVal = Math.round(baseHoldings * varianceFactor);
    const simulatedTotal = baseCash + simulatedHoldingsVal;

    const payload = {
      userId,
      valuationDate: dateStr,
      valuationTimestamp: historicalDate,
      cashBalancePaise: baseCash,
      holdingsMarketValuePaise: simulatedHoldingsVal,
      totalPortfolioValuePaise: simulatedTotal,
      priceSource: 'HISTORICAL_SEED',
      isSimulated: true,
      positionsSnapshot: positionBreakdown.map((p) => ({
        ...p,
        marketValuePaise: Math.round(p.marketValuePaise * varianceFactor),
      })),
      metadata: {
        schemaVersion: 1,
        timezone: 'Asia/Kolkata',
        positionsCount: positionBreakdown.length,
        synthetic: true,
        notes: `Synthetic backfilled snapshot for development/testing (day -${i}). Not an empirical historical exchange observation.`,
      },
    };

    const doc = await PortfolioSnapshot.findOneAndUpdate(
      { userId, valuationDate: dateStr },
      { $set: payload },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    created.push(doc);
  }

  // Also record today's current snapshot
  const todaySnap = await createDailySnapshotForUser(userId, {
    notes: "Today's current active valuation snapshot",
  });
  created.push(todaySnap);

  return created;
};

/**
 * Initializes safe daily background snapshot scheduler.
 * Guaranteed singleton: clears any prior interval before setting a new one.
 * Runs once every 6 hours to check if a new daily snapshot is required.
 */
export const initSnapshotScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  // Check every 6 hours (21,600,000 ms)
  const INTERVAL_MS = 6 * 60 * 60 * 1000;

  schedulerTimer = setInterval(async () => {
    try {
      console.log('[Snapshot Scheduler] Running automated daily snapshot cycle...');
      const summary = await createDailySnapshotsForAllUsers();
      console.log(`[Snapshot Scheduler] Completed: ${summary.successes} succeeded, ${summary.failures} failed.`);
    } catch (err) {
      console.error('[Snapshot Scheduler Error] Failed scheduled snapshot cycle:', err.message);
    }
  }, INTERVAL_MS);

  // Prevent scheduler from keeping Node process alive if exiting
  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }

  console.log('[WealthOS] Daily portfolio snapshot scheduler initialized (Asia/Kolkata timezone).');
};

/**
 * Stops snapshot scheduler (useful for cleanup and tests).
 */
export const stopSnapshotScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
};
