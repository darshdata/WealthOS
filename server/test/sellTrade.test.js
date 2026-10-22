import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetPortfolio,
  apiExecuteTrade,
  generateTestUserId,
  generateIdempotencyKey,
} from './testHelper.js';

describe('Valid SELL Execution Engine Tests', () => {
  test('Partial SELL correctly decreases position quantity, increases cash, and preserves cost basis', async () => {
    const testUserId = generateTestUserId('sell-user');

    // 1. Initial portfolio has 25 shares of RELIANCE @ 284000 paise
    const initialRes = await apiGetPortfolio(testUserId);
    const initialCash = initialRes.data.portfolio.cashBalancePaise;
    const initialReliance = initialRes.data.portfolio.positions.find((p) => p.symbol === 'RELIANCE');
    assert.ok(initialReliance);
    const initialQty = initialReliance.quantity; // 25
    const originalCostBasis = initialReliance.avgBuyPricePaise; // 284000

    // 2. Sell 10 shares at ₹3,100.00 (310000 paise)
    const sellQty = 10;
    const sellPricePaise = 310000;
    const totalProceedsPaise = sellQty * sellPricePaise;
    const expectedRemainingQty = initialQty - sellQty; // 15
    const expectedNewCash = initialCash + totalProceedsPaise;

    const tradeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'SELL',
      quantity: sellQty,
      pricePaise: sellPricePaise,
    });

    assert.equal(tradeRes.status, 201, 'Partial SELL must return HTTP 201');
    assert.equal(
      tradeRes.data.portfolio.cashBalancePaise,
      expectedNewCash,
      'Cash balance must increase by total sell proceeds'
    );

    const updatedReliance = tradeRes.data.portfolio.positions.find((p) => p.symbol === 'RELIANCE');
    assert.ok(updatedReliance, 'Position must still exist after partial sale');
    assert.equal(updatedReliance.quantity, expectedRemainingQty, 'Quantity must decrease by sold shares');
    assert.equal(
      updatedReliance.avgBuyPricePaise,
      originalCostBasis,
      'Cost basis (avgBuyPrice) of remaining shares must remain unchanged'
    );

    // Verify transaction ledger entry
    assert.ok(tradeRes.data.transaction);
    assert.equal(tradeRes.data.transaction.type, 'SELL');
    assert.equal(tradeRes.data.transaction.symbol, 'RELIANCE');
    assert.equal(tradeRes.data.transaction.quantity, sellQty);
    assert.equal(tradeRes.data.transaction.executionPricePaise, sellPricePaise);
    assert.equal(tradeRes.data.transaction.totalValuePaise, totalProceedsPaise);
    assert.equal(tradeRes.data.transaction.status, 'COMPLETED');
  });

  test('Full SELL (closing entire position) removes position from portfolio', async () => {
    const testUserId = generateTestUserId('sell-full');

    const initialRes = await apiGetPortfolio(testUserId);
    const initialTcs = initialRes.data.portfolio.positions.find((p) => p.symbol === 'TCS');
    assert.ok(initialTcs);
    const tcsQty = initialTcs.quantity; // 15

    const sellPricePaise = 390000; // ₹3,900.00
    const tradeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'TCS',
      type: 'SELL',
      quantity: tcsQty,
      pricePaise: sellPricePaise,
    });

    assert.equal(tradeRes.status, 201);
    const remainingTcs = tradeRes.data.portfolio.positions.find((p) => p.symbol === 'TCS');
    assert.equal(
      remainingTcs,
      undefined,
      'Completely liquidated position must be removed from positions array'
    );
  });
});
