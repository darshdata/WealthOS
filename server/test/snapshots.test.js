import dotenv from 'dotenv';
dotenv.config();

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import {
  generateTestUserId,
  apiGetPortfolio,
  apiGetSnapshots,
  apiTriggerSnapshot,
} from './testHelper.js';
import {
  setServerMarketPrice,
  resetServerMarketPrices,
} from '../src/services/marketPriceService.js';
import {
  createDailySnapshotForUser,
} from '../src/services/snapshotService.js';
import Portfolio from '../src/models/Portfolio.js';
import PortfolioSnapshot from '../src/models/PortfolioSnapshot.js';

describe('Historical Portfolio Snapshots & Analytics Integrity Tests', () => {
  before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('Snapshot calculation and currency precision: cash + holdings = total net worth', async () => {
    const testUser = generateTestUserId('prec-snap');

    // 1. Seed portfolio with known quantities and set deterministic prices
    setServerMarketPrice('RELIANCE', 300000); // ₹3,000.00
    setServerMarketPrice('TCS', 400000); // ₹4,000.00

    // Auto-seed user portfolio
    await apiGetPortfolio(testUser);

    // Overwrite with exact positions: 10 RELIANCE (₹30,000), 5 TCS (₹20,000), cash: ₹1,00,000 (10000000 paise)
    await Portfolio.findOneAndUpdate(
      { userId: testUser },
      {
        $set: {
          cashBalancePaise: 10000000,
          positions: [
            { symbol: 'RELIANCE', name: 'Reliance Ind', sector: 'Energy', quantity: 10, avgBuyPricePaise: 280000 },
            { symbol: 'TCS', name: 'TCS', sector: 'Technology', quantity: 5, avgBuyPricePaise: 380000 },
          ],
        },
      }
    );

    // Trigger snapshot
    const snap = await createDailySnapshotForUser(testUser, {
      valuationDate: '2026-10-20',
      valuationTimestamp: new Date('2026-10-20T12:00:00.000Z'),
    });

    assert.equal(snap.cashBalancePaise, 10000000);
    // 10 * 300000 + 5 * 400000 = 3000000 + 2000000 = 5000000 paise (₹50,000)
    assert.equal(snap.holdingsMarketValuePaise, 5000000);
    // Total = 10000000 + 5000000 = 15000000 paise (₹1,50,000)
    assert.equal(snap.totalPortfolioValuePaise, 15000000);
    assert.equal(snap.isSimulated, true);
    assert.equal(snap.priceSource, 'SERVER_SIMULATED');
    assert.equal(snap.metadata.timezone, 'Asia/Kolkata');

    resetServerMarketPrices();
  });

  it('Empty portfolios and cash-only portfolios snapshot creation', async () => {
    const testUser = generateTestUserId('cash-only');

    // Create cash-only portfolio with 0 positions
    await Portfolio.create({
      userId: testUser,
      cashBalancePaise: 50000000, // ₹5,00,000
      positions: [],
    });

    const snap = await createDailySnapshotForUser(testUser, {
      valuationDate: '2026-10-21',
    });

    assert.equal(snap.cashBalancePaise, 50000000);
    assert.equal(snap.holdingsMarketValuePaise, 0);
    assert.equal(snap.totalPortfolioValuePaise, 50000000);
    assert.equal(snap.positionsSnapshot.length, 0);
  });

  it('Duplicate daily snapshot attempts: idempotent upsert without creating duplicate documents', async () => {
    const testUser = generateTestUserId('idemp-snap');
    await apiGetPortfolio(testUser);

    const testDate = '2026-10-15';

    // First snapshot execution
    const snap1 = await createDailySnapshotForUser(testUser, { valuationDate: testDate });
    const countAfterFirst = await PortfolioSnapshot.countDocuments({ userId: testUser, valuationDate: testDate });
    assert.equal(countAfterFirst, 1);

    // Second snapshot execution on same valuationDate
    const snap2 = await createDailySnapshotForUser(testUser, { valuationDate: testDate });
    const countAfterSecond = await PortfolioSnapshot.countDocuments({ userId: testUser, valuationDate: testDate });
    assert.equal(countAfterSecond, 1); // Strictly 1 document, no duplicates!

    assert.equal(snap1._id.toString(), snap2._id.toString());
  });

  it('Multiple users or portfolios remain strictly isolated', async () => {
    const userA = generateTestUserId('userA');
    const userB = generateTestUserId('userB');

    await Portfolio.create({
      userId: userA,
      cashBalancePaise: 11111111,
      positions: [],
    });
    await Portfolio.create({
      userId: userB,
      cashBalancePaise: 22222222,
      positions: [],
    });

    await createDailySnapshotForUser(userA, { valuationDate: '2026-10-18' });
    await createDailySnapshotForUser(userB, { valuationDate: '2026-10-18' });

    const snapA = await PortfolioSnapshot.findOne({ userId: userA });
    const snapB = await PortfolioSnapshot.findOne({ userId: userB });

    assert.equal(snapA.cashBalancePaise, 11111111);
    assert.equal(snapB.cashBalancePaise, 22222222);
    assert.notEqual(snapA.cashBalancePaise, snapB.cashBalancePaise);
  });

  it('Historical query ordering and date filtering', async () => {
    const testUser = generateTestUserId('order-snap');
    await apiGetPortfolio(testUser);

    // Seed snapshots for 3 dates in non-chronological order
    await createDailySnapshotForUser(testUser, { valuationDate: '2026-10-12' });
    await createDailySnapshotForUser(testUser, { valuationDate: '2026-10-10' });
    await createDailySnapshotForUser(testUser, { valuationDate: '2026-10-14' });

    // Query all: must be returned chronologically ascending
    const resAll = await apiGetSnapshots(testUser);
    assert.equal(resAll.status, 200);
    assert.equal(resAll.data.count, 3);
    assert.equal(resAll.data.snapshots[0].valuationDate, '2026-10-10');
    assert.equal(resAll.data.snapshots[1].valuationDate, '2026-10-12');
    assert.equal(resAll.data.snapshots[2].valuationDate, '2026-10-14');

    // Query with date range filter: startDate = 2026-10-11, endDate = 2026-10-13
    const resFiltered = await apiGetSnapshots(testUser, {
      startDate: '2026-10-11',
      endDate: '2026-10-13',
    });
    assert.equal(resFiltered.status, 200);
    assert.equal(resFiltered.data.count, 1);
    assert.equal(resFiltered.data.snapshots[0].valuationDate, '2026-10-12');
  });

  it('Missing history and invalid query parameters', async () => {
    const testUser = generateTestUserId('missing-snap');

    // Missing history returns empty array with HTTP 200 (no fabrication or error)
    const resEmpty = await apiGetSnapshots(testUser);
    assert.equal(resEmpty.status, 200);
    assert.equal(resEmpty.data.success, true);
    assert.equal(resEmpty.data.count, 0);
    assert.deepEqual(resEmpty.data.snapshots, []);

    // Invalid startDate format rejected with HTTP 400
    const resInvalidDate = await apiGetSnapshots(testUser, { startDate: 'invalid-date' });
    assert.equal(resInvalidDate.status, 400);
    assert.equal(resInvalidDate.data.error, 'Validation Error');

    // Invalid limit (> 365 or not a number) rejected with HTTP 400
    const resInvalidLimit = await apiGetSnapshots(testUser, { limit: '999' });
    assert.equal(resInvalidLimit.status, 400);
    assert.equal(resInvalidLimit.data.error, 'Validation Error');

    // Inverted date range (startDate > endDate) rejected with HTTP 400
    const resInvertedDates = await apiGetSnapshots(testUser, {
      startDate: '2026-10-25',
      endDate: '2026-10-20',
    });
    assert.equal(resInvertedDates.status, 400);
    assert.equal(resInvertedDates.data.error, 'Validation Error');
    assert.equal(resInvertedDates.data.message, 'startDate cannot be after endDate');
  });

  it('Snapshot job failure handling when user has no portfolio', async () => {
    const ghostUser = generateTestUserId('ghost');
    await assert.rejects(
      async () => {
        await createDailySnapshotForUser(ghostUser);
      },
      {
        message: `Portfolio not found for user: '${ghostUser}'`,
      }
    );
  });

  it('Manual triggering and historical seeding via API', async () => {
    const testUser = generateTestUserId('seed-snap');

    // Trigger seeding of 5 daily snapshots
    const seedRes = await apiTriggerSnapshot(testUser, { seedDays: 5 });
    assert.equal(seedRes.status, 200);
    assert.equal(seedRes.data.success, true);
    assert.equal(seedRes.data.count, 6); // 5 historical + 1 today

    // Verify fetched via GET /api/portfolio/snapshots
    const getRes = await apiGetSnapshots(testUser);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.data.count, 6);
  });
});
