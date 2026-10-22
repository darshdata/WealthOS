import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReturns,
  calculateAllocations,
  calculateConcentrationMetrics,
  getPerformanceSeries,
  formatSnapshotChartData,
} from '../src/utils/analyticsMath.js';

describe('Analytics Math Engine Tests', () => {
  describe('Returns & P&L Calculation with Safe Denominator', () => {
    it('handles positive P&L correctly with correct percentage return', () => {
      // Invested: ₹1,00,000 (10000000 paise), Current: ₹1,20,000 (12000000 paise) -> +₹20,000 (+20.00%)
      const result = calculateReturns({
        investedSubunits: 10000000,
        currentSubunits: 12000000,
      });

      assert.equal(result.investedSubunits, 10000000);
      assert.equal(result.currentSubunits, 12000000);
      assert.equal(result.pnlSubunits, 2000000);
      assert.equal(result.returnPercent, 20.0);
      assert.equal(result.isPositive, true);
      assert.equal(result.hasInvestedCapital, true);
    });

    it('handles negative P&L correctly without sign distortion', () => {
      // Invested: ₹2,00,000 (20000000 paise), Current: ₹1,50,000 (15000000 paise) -> -₹50,000 (-25.00%)
      const result = calculateReturns({
        investedSubunits: 20000000,
        currentSubunits: 15000000,
      });

      assert.equal(result.investedSubunits, 20000000);
      assert.equal(result.currentSubunits, 15000000);
      assert.equal(result.pnlSubunits, -5000000);
      assert.equal(result.returnPercent, -25.0);
      assert.equal(result.isPositive, false);
      assert.equal(result.hasInvestedCapital, true);
    });

    it('safely handles zero invested capital without division by zero or NaN', () => {
      // Invested: 0, Current: 0
      const resultZero = calculateReturns({
        investedSubunits: 0,
        currentSubunits: 0,
      });

      assert.equal(resultZero.investedSubunits, 0);
      assert.equal(resultZero.currentSubunits, 0);
      assert.equal(resultZero.pnlSubunits, 0);
      assert.equal(resultZero.returnPercent, 0);
      assert.equal(Number.isNaN(resultZero.returnPercent), false);
      assert.equal(resultZero.hasInvestedCapital, false);
    });

    it('safely handles zero invested capital with non-zero current balance', () => {
      const result = calculateReturns({
        investedSubunits: 0,
        currentSubunits: 500000,
      });

      assert.equal(result.investedSubunits, 0);
      assert.equal(result.pnlSubunits, 500000);
      assert.equal(result.returnPercent, 0);
      assert.equal(Number.isNaN(result.returnPercent), false);
    });
  });

  describe('Allocation Analysis (Holdings vs Portfolio with Cash)', () => {
    it('handles an empty portfolio and zero cash without division by zero or NaN', () => {
      const result = calculateAllocations([], 0);

      assert.equal(result.totalHoldingsSubunits, 0);
      assert.equal(result.totalPortfolioSubunits, 0);
      assert.equal(result.cashSubunits, 0);
      assert.equal(result.cashAllocationPercent, 0);
      assert.deepEqual(result.instrumentAllocations, []);
      assert.deepEqual(result.sectorAllocations, []);
      assert.equal(result.holdingsCount, 0);
    });

    it('clearly distinguishes holdings allocation from total portfolio allocation including cash', () => {
      // 2 stocks:
      // RELIANCE: ₹60,000 (6000000 paise)
      // TCS: ₹40,000 (4000000 paise)
      // Total Holdings: ₹1,00,000 (10000000 paise)
      // Cash: ₹1,00,000 (10000000 paise)
      // Total Portfolio: ₹2,00,000 (20000000 paise)
      const holdings = [
        { symbol: 'RELIANCE', name: 'Reliance Ind', sector: 'Energy', currentSubunits: 6000000, quantity: 20 },
        { symbol: 'TCS', name: 'Tata Consultancy', sector: 'Technology', currentSubunits: 4000000, quantity: 10 },
      ];
      const cashPaise = 10000000;

      const result = calculateAllocations(holdings, cashPaise);

      assert.equal(result.totalHoldingsSubunits, 10000000);
      assert.equal(result.totalPortfolioSubunits, 20000000);
      assert.equal(result.cashSubunits, 10000000);
      assert.equal(result.cashAllocationPercent, 50.0);

      // RELIANCE is 60% of holdings, but 30% of total portfolio
      const reliance = result.instrumentAllocations.find((i) => i.symbol === 'RELIANCE');
      assert.equal(reliance.holdingsPercent, 60.0);
      assert.equal(reliance.portfolioPercent, 30.0);

      // TCS is 40% of holdings, but 20% of total portfolio
      const tcs = result.instrumentAllocations.find((i) => i.symbol === 'TCS');
      assert.equal(tcs.holdingsPercent, 40.0);
      assert.equal(tcs.portfolioPercent, 20.0);

      // Sum of holdings allocations equals 100%
      const totalHoldingsWeights = result.instrumentAllocations.reduce((sum, i) => sum + i.holdingsPercent, 0);
      assert.equal(Math.round(totalHoldingsWeights), 100);

      // Sum of total portfolio allocations (instruments + cash) equals 100%
      const totalPortfolioWeights =
        result.instrumentAllocations.reduce((sum, i) => sum + i.portfolioPercent, 0) +
        result.cashAllocationPercent;
      assert.equal(Math.round(totalPortfolioWeights), 100);
    });

    it('handles sector allocation aggregation accurately', () => {
      const holdings = [
        { symbol: 'TCS', sector: 'Technology', currentSubunits: 3000000, quantity: 10 },
        { symbol: 'INFY', sector: 'Technology', currentSubunits: 2000000, quantity: 15 },
        { symbol: 'HDFCBANK', sector: 'Banking', currentSubunits: 5000000, quantity: 25 },
      ];
      const result = calculateAllocations(holdings, 0);

      assert.equal(result.sectorAllocations.length, 2);
      const techSector = result.sectorAllocations.find((s) => s.sector === 'Technology');
      const bankSector = result.sectorAllocations.find((s) => s.sector === 'Banking');

      assert.equal(techSector.currentSubunits, 5000000);
      assert.equal(techSector.holdingsPercent, 50.0);
      assert.equal(techSector.positionCount, 2);

      assert.equal(bankSector.currentSubunits, 5000000);
      assert.equal(bankSector.holdingsPercent, 50.0);
      assert.equal(bankSector.positionCount, 1);
    });
  });

  describe('Risk and Concentration Metrics', () => {
    it('returns empty and zero metrics safely for an empty portfolio', () => {
      const result = calculateConcentrationMetrics([], 10000000);

      assert.equal(result.hasPositions, false);
      assert.equal(result.largestPosition, null);
      assert.equal(result.largestHoldingPercent, 0);
      assert.equal(result.top3ConcentrationPercent, 0);
      assert.equal(result.top5ConcentrationPercent, 0);
      assert.equal(result.herfindahlIndex, 0);
      assert.equal(result.concentrationLevel, 'NONE');
    });

    it('accurately measures single large holding concentration against multiple smaller holdings', () => {
      // 1 Large Holding (RELIANCE: 70%) and 3 smaller holdings (10% each)
      const holdings = [
        { symbol: 'RELIANCE', name: 'Reliance Ind', sector: 'Energy', currentSubunits: 7000000, quantity: 70 },
        { symbol: 'TCS', name: 'TCS', sector: 'Technology', currentSubunits: 1000000, quantity: 10 },
        { symbol: 'INFY', name: 'Infosys', sector: 'Technology', currentSubunits: 1000000, quantity: 10 },
        { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', currentSubunits: 1000000, quantity: 10 },
      ];

      const result = calculateConcentrationMetrics(holdings, 0);

      assert.equal(result.hasPositions, true);
      assert.equal(result.largestPosition.symbol, 'RELIANCE');
      assert.equal(result.largestHoldingPercent, 70.0);
      assert.equal(result.top3ConcentrationPercent, 90.0); // 70 + 10 + 10 = 90
      assert.equal(result.top5ConcentrationPercent, 100.0);

      // HHI = 70^2 + 10^2 + 10^2 + 10^2 = 4900 + 100 + 100 + 100 = 5200 (High concentration)
      assert.equal(result.herfindahlIndex, 5200);
      assert.equal(result.concentrationLevel, 'HIGH');
    });

    it('identifies diversified portfolio when holdings are evenly spread', () => {
      // 5 evenly balanced holdings (20% each)
      const holdings = [
        { symbol: 'A', sector: 'Sector 1', currentSubunits: 2000000, quantity: 10 },
        { symbol: 'B', sector: 'Sector 2', currentSubunits: 2000000, quantity: 10 },
        { symbol: 'C', sector: 'Sector 3', currentSubunits: 2000000, quantity: 10 },
        { symbol: 'D', sector: 'Sector 4', currentSubunits: 2000000, quantity: 10 },
        { symbol: 'E', sector: 'Sector 5', currentSubunits: 2000000, quantity: 10 },
      ];

      const result = calculateConcentrationMetrics(holdings, 0);

      assert.equal(result.largestHoldingPercent, 20.0);
      assert.equal(result.top3ConcentrationPercent, 60.0);
      // HHI = 5 * 20^2 = 5 * 400 = 2000 (Moderate)
      assert.equal(result.herfindahlIndex, 2000);
      assert.equal(result.concentrationLevel, 'MODERATE');
    });
  });

  describe('Historical & Benchmark Availability Disclosures', () => {
    it('flags simulated benchmark and missing historical database persistence accurately', () => {
      const result = getPerformanceSeries(550000);

      assert.equal(result.isHistoricalPersisted, false);
      assert.equal(result.isSimulated, true);
      assert.equal(result.benchmarkAvailable, false);
      assert.equal(typeof result.disclosure, 'string');
      assert.ok(result.disclosure.includes('illustrative simulations'));
      assert.ok(result.series.length > 0);
    });
  });

  describe('Persisted Snapshot Chart Formatting', () => {
    it('returns empty history and safe defaults when snapshot array is empty', () => {
      const result = formatSnapshotChartData([]);
      assert.equal(result.hasHistory, false);
      assert.equal(result.isPersisted, true);
      assert.equal(result.count, 0);
      assert.deepEqual(result.series, []);
    });

    it('identifies insufficient history when only 1 snapshot exists', () => {
      const result = formatSnapshotChartData([
        {
          valuationDate: '2026-10-22',
          totalPortfolioValuePaise: 50000000,
          cashBalancePaise: 25000000,
          holdingsMarketValuePaise: 25000000,
          isSimulated: true,
        },
      ]);
      assert.equal(result.hasHistory, false); // requires >= 2 to plot trajectory
      assert.equal(result.count, 1);
      assert.equal(result.series[0].portfolio, 500000);
      assert.equal(result.series[0].cash, 250000);
      assert.equal(result.series[0].holdings, 250000);
    });

    it('correctly maps and sorts chronologically when multiple snapshots exist', () => {
      const snapshots = [
        {
          valuationDate: '2026-10-21',
          totalPortfolioValuePaise: 51000000,
          cashBalancePaise: 20000000,
          holdingsMarketValuePaise: 31000000,
        },
        {
          valuationDate: '2026-10-20',
          totalPortfolioValuePaise: 50000000,
          cashBalancePaise: 25000000,
          holdingsMarketValuePaise: 25000000,
        },
        {
          valuationDate: '2026-10-22',
          totalPortfolioValuePaise: 52000000,
          cashBalancePaise: 20000000,
          holdingsMarketValuePaise: 32000000,
        },
      ];

      const result = formatSnapshotChartData(snapshots);
      assert.equal(result.hasHistory, true);
      assert.equal(result.count, 3);
      // Order must be 2026-10-20 -> 2026-10-21 -> 2026-10-22
      assert.equal(result.series[0].valuationDate, '2026-10-20');
      assert.equal(result.series[0].portfolio, 500000);
      assert.equal(result.series[1].valuationDate, '2026-10-21');
      assert.equal(result.series[1].portfolio, 510000);
      assert.equal(result.series[2].valuationDate, '2026-10-22');
      assert.equal(result.series[2].portfolio, 520000);
    });
  });
});
