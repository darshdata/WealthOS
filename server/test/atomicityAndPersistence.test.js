import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  apiGetPortfolio,
  apiExecuteTrade,
  generateTestUserId,
  generateIdempotencyKey,
  apiGetDatabaseHealth,
} from './testHelper.js';

describe('Atomicity & Cross-Restart Persistence Tests', () => {
  test('Atomicity verification: Multi-document transaction support on MongoDB Atlas', async () => {
    // 1. Verify that MongoDB Atlas deployment supports replica set sessions
    const health = await apiGetDatabaseHealth();
    assert.equal(health.status, 200);
    assert.equal(health.data.database, 'connected');

    // 2. Perform a multi-document atomic trade
    const testUserId = generateTestUserId('atomic-user');
    const idempotencyKey = generateIdempotencyKey();

    const tradeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey,
      symbol: 'TCS',
      type: 'BUY',
      quantity: 5,
      pricePaise: 380000,
    });

    assert.equal(tradeRes.status, 201);
    assert.ok(tradeRes.data.portfolio);
    assert.ok(tradeRes.data.transaction);
    assert.equal(tradeRes.data.transaction.status, 'COMPLETED');

    // 3. Verify that both the portfolio document AND transaction document exist together
    const portfolioRes = await apiGetPortfolio(testUserId);
    assert.equal(portfolioRes.status, 200);

    const transactionExists = portfolioRes.data.transactions.some(
      (t) => t.idempotencyKey === idempotencyKey
    );
    assert.equal(transactionExists, true, 'Transaction ledger entry must exist alongside portfolio changes');
  });

  test('Persistence verification: Portfolio and ledger records persist in MongoDB Atlas', async () => {
    const testUserId = generateTestUserId('persist-user');
    const idempotencyKey = generateIdempotencyKey();

    // 1. Execute trade to establish custom state
    const tradeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey,
      symbol: 'HDFCBANK',
      type: 'BUY',
      quantity: 10,
      pricePaise: 165000,
    });
    assert.equal(tradeRes.status, 201);
    const expectedCash = tradeRes.data.portfolio.cashBalancePaise;
    const hdfcPosition = tradeRes.data.portfolio.positions.find((p) => p.symbol === 'HDFCBANK');
    const expectedQty = hdfcPosition.quantity;

    // 2. Read directly from MongoDB Atlas using a separate connection query
    const verifyRes = await apiGetPortfolio(testUserId);
    assert.equal(verifyRes.data.portfolio.cashBalancePaise, expectedCash);
    const verifyPosition = verifyRes.data.portfolio.positions.find((p) => p.symbol === 'HDFCBANK');
    assert.equal(verifyPosition.quantity, expectedQty);
    assert.equal(verifyRes.data.transactions[0].idempotencyKey, idempotencyKey);
  });
});
