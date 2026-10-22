import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetPortfolio,
  apiExecuteTrade,
  generateTestUserId,
  generateIdempotencyKey,
} from './testHelper.js';

describe('Valid BUY Execution Engine Tests', () => {
  test('BUY of an existing position correctly updates cash, quantity, and weighted average price', async () => {
    const testUserId = generateTestUserId('buy-user');

    // 1. Fetch initial portfolio
    const initialRes = await apiGetPortfolio(testUserId);
    assert.equal(initialRes.status, 200);
    const initialCash = initialRes.data.portfolio.cashBalancePaise;
    const initialReliance = initialRes.data.portfolio.positions.find((p) => p.symbol === 'RELIANCE');
    assert.ok(initialReliance, 'Default portfolio must include RELIANCE');

    const prevQty = initialReliance.quantity; // 25
    const prevAvg = initialReliance.avgBuyPricePaise; // 284000

    // 2. Execute a BUY of 10 shares of RELIANCE at ₹3,000.00 (300000 paise)
    const buyQty = 10;
    const buyPricePaise = 300000;
    const totalCostPaise = buyQty * buyPricePaise; // 30,00,000 paise

    const expectedNewQty = prevQty + buyQty; // 35
    const expectedNewAvg = Math.round((prevQty * prevAvg + totalCostPaise) / expectedNewQty);
    const expectedNewCash = initialCash - totalCostPaise;

    const idempotencyKey = generateIdempotencyKey();
    const tradeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey,
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      sector: 'Energy & Conglomerate',
      type: 'BUY',
      quantity: buyQty,
      pricePaise: buyPricePaise,
    });

    assert.equal(tradeRes.status, 201, 'Valid BUY must return HTTP 201');
    assert.equal(tradeRes.data.success, true);
    assert.equal(
      tradeRes.data.portfolio.cashBalancePaise,
      expectedNewCash,
      'Cash balance must decrease by exact trade value'
    );

    const updatedReliance = tradeRes.data.portfolio.positions.find((p) => p.symbol === 'RELIANCE');
    assert.ok(updatedReliance);
    assert.equal(updatedReliance.quantity, expectedNewQty, 'Quantity must increase by purchased shares');
    assert.equal(
      updatedReliance.avgBuyPricePaise,
      expectedNewAvg,
      'Weighted average buy price must match formula calculation'
    );

    // Verify transaction ledger entry
    assert.ok(tradeRes.data.transaction, 'Transaction ledger entry must be returned');
    assert.equal(tradeRes.data.transaction.type, 'BUY');
    assert.equal(tradeRes.data.transaction.symbol, 'RELIANCE');
    assert.equal(tradeRes.data.transaction.quantity, buyQty);
    assert.equal(tradeRes.data.transaction.executionPricePaise, buyPricePaise);
    assert.equal(tradeRes.data.transaction.totalValuePaise, totalCostPaise);
    assert.equal(tradeRes.data.transaction.status, 'COMPLETED');

    // Verify persistence via GET /api/portfolio
    const fetchedRes = await apiGetPortfolio(testUserId);
    assert.equal(fetchedRes.data.portfolio.cashBalancePaise, expectedNewCash);
    const fetchedReliance = fetchedRes.data.portfolio.positions.find((p) => p.symbol === 'RELIANCE');
    assert.equal(fetchedReliance.quantity, expectedNewQty);
    assert.equal(fetchedReliance.avgBuyPricePaise, expectedNewAvg);
    assert.equal(fetchedRes.data.transactions[0].idempotencyKey, idempotencyKey);
  });

  test('BUY of a new position not currently held creates a new position entry', async () => {
    const testUserId = generateTestUserId('buy-new');

    const initialRes = await apiGetPortfolio(testUserId);
    const initialCash = initialRes.data.portfolio.cashBalancePaise;
    const initialPaytm = initialRes.data.portfolio.positions.find((p) => p.symbol === 'PAYTM');
    assert.equal(initialPaytm, undefined, 'PAYTM should not be in default positions');

    const buyQty = 20;
    const buyPricePaise = 42580; // ₹425.80
    const totalCostPaise = buyQty * buyPricePaise;

    const tradeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'PAYTM',
      name: 'One97 Communications Ltd. (Paytm)',
      sector: 'FinTech & Digital Payments',
      type: 'BUY',
      quantity: buyQty,
      pricePaise: buyPricePaise,
    });

    assert.equal(tradeRes.status, 201);
    assert.equal(tradeRes.data.portfolio.cashBalancePaise, initialCash - totalCostPaise);

    const newPosition = tradeRes.data.portfolio.positions.find((p) => p.symbol === 'PAYTM');
    assert.ok(newPosition, 'PAYTM position must be created');
    assert.equal(newPosition.quantity, buyQty);
    assert.equal(newPosition.avgBuyPricePaise, buyPricePaise);
    assert.equal(newPosition.sector, 'FinTech & Digital Payments');
  });
});
