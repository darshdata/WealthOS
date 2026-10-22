import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetPortfolio,
  apiExecuteTrade,
  generateTestUserId,
  generateIdempotencyKey,
} from './testHelper.js';

describe('Idempotency & Concurrent Race Protection Tests', () => {
  test('Sequential replay with identical idempotencyKey returns cached transaction without duplicate execution', async () => {
    const testUserId = generateTestUserId('idemp-seq');
    const idempotencyKey = generateIdempotencyKey();

    // 1. First execution
    const firstRes = await apiExecuteTrade(testUserId, {
      idempotencyKey,
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      sector: 'IT Services & Consulting',
      type: 'BUY',
      quantity: 5,
      pricePaise: 150000,
    });
    assert.equal(firstRes.status, 201, 'First execution must succeed with HTTP 201');
    const cashAfterFirst = firstRes.data.portfolio.cashBalancePaise;
    const infyQtyAfterFirst = firstRes.data.portfolio.positions.find((p) => p.symbol === 'INFY').quantity;
    const txId = firstRes.data.transaction._id;

    // 2. Replay with the SAME idempotencyKey
    const replayRes = await apiExecuteTrade(testUserId, {
      idempotencyKey,
      symbol: 'INFY',
      type: 'BUY',
      quantity: 5,
      pricePaise: 150000,
    });

    assert.equal(replayRes.status, 200, 'Replayed execution must return HTTP 200');
    assert.equal(replayRes.data.isDuplicate, true, 'isDuplicate flag must be true');
    assert.equal(replayRes.data.transaction._id, txId, 'Returned transaction ID must match original');

    // 3. Query portfolio to confirm no double deduction or position inflation
    const fetchedRes = await apiGetPortfolio(testUserId);
    assert.equal(
      fetchedRes.data.portfolio.cashBalancePaise,
      cashAfterFirst,
      'Cash balance must not change on duplicate request'
    );
    const fetchedInfy = fetchedRes.data.portfolio.positions.find((p) => p.symbol === 'INFY');
    assert.equal(
      fetchedInfy.quantity,
      infyQtyAfterFirst,
      'Position quantity must not duplicate'
    );

    // Filter transactions by idempotencyKey to ensure exactly one document exists
    const matchingTxs = fetchedRes.data.transactions.filter(
      (t) => t.idempotencyKey === idempotencyKey
    );
    assert.equal(matchingTxs.length, 1, 'Exactly one transaction ledger document must exist');
  });

  test('Concurrent duplicate requests with the same idempotencyKey resolve without race condition', async () => {
    const testUserId = generateTestUserId('idemp-concurrent');
    const idempotencyKey = generateIdempotencyKey();

    const initialRes = await apiGetPortfolio(testUserId);
    const initialCash = initialRes.data.portfolio.cashBalancePaise;
    const initialZomato = initialRes.data.portfolio.positions.find((p) => p.symbol === 'ZOMATO');
    const initialQty = initialZomato.quantity;

    const buyQty = 50;
    const buyPrice = 20000; // 20000 paise = ₹200.00
    const totalCost = buyQty * buyPrice;

    // Fire 3 simultaneous concurrent requests with the EXACT same idempotencyKey
    const promises = [
      apiExecuteTrade(testUserId, {
        idempotencyKey,
        symbol: 'ZOMATO',
        type: 'BUY',
        quantity: buyQty,
        pricePaise: buyPrice,
      }),
      apiExecuteTrade(testUserId, {
        idempotencyKey,
        symbol: 'ZOMATO',
        type: 'BUY',
        quantity: buyQty,
        pricePaise: buyPrice,
      }),
      apiExecuteTrade(testUserId, {
        idempotencyKey,
        symbol: 'ZOMATO',
        type: 'BUY',
        quantity: buyQty,
        pricePaise: buyPrice,
      }),
    ];

    const results = await Promise.all(promises);

    // All requests must return HTTP 200 or 201 (no 500 crashes)
    for (const res of results) {
      assert.ok(
        res.status === 200 || res.status === 201,
        `Concurrent response status must be 200 or 201, got ${res.status}`
      );
      assert.equal(res.data.success, true);
    }

    // Exactly one must be 201 (the winner), while the other 2 must be 200 with isDuplicate: true
    const createdCount = results.filter((r) => r.status === 201).length;
    const duplicateCount = results.filter((r) => r.status === 200 && r.data.isDuplicate).length;

    assert.equal(createdCount, 1, 'Exactly one concurrent request must be executed as new');
    assert.equal(duplicateCount, 2, 'Other concurrent requests must be resolved as duplicates');

    // Verify final database state
    const finalRes = await apiGetPortfolio(testUserId);
    assert.equal(
      finalRes.data.portfolio.cashBalancePaise,
      initialCash - totalCost,
      'Cash must be deducted EXACTLY once despite concurrent attempts'
    );

    const finalZomato = finalRes.data.portfolio.positions.find((p) => p.symbol === 'ZOMATO');
    assert.equal(
      finalZomato.quantity,
      initialQty + buyQty,
      'Position must be incremented EXACTLY once'
    );

    const matchingTxs = finalRes.data.transactions.filter(
      (t) => t.idempotencyKey === idempotencyKey
    );
    assert.equal(matchingTxs.length, 1, 'Only one transaction ledger record must exist in DB');
  });

  test('Cross-account idempotency key reuse is rejected with HTTP 409 Conflict and zero data leak', async () => {
    const userA = generateTestUserId('user-a');
    const userB = generateTestUserId('user-b');
    const sharedKey = generateIdempotencyKey();

    // User A executes trade successfully
    const resA = await apiExecuteTrade(userA, {
      idempotencyKey: sharedKey,
      symbol: 'INFY',
      type: 'BUY',
      quantity: 5,
      pricePaise: 152000,
    });
    assert.equal(resA.status, 201, 'User A execution must succeed');
    assert.equal(resA.data.success, true);

    // User B attempts to execute with the EXACT same idempotencyKey
    const resB = await apiExecuteTrade(userB, {
      idempotencyKey: sharedKey,
      symbol: 'INFY',
      type: 'BUY',
      quantity: 5,
      pricePaise: 152000,
    });
    assert.equal(resB.status, 409, 'Cross-account idempotency key reuse must return HTTP 409 Conflict');
    assert.equal(resB.data.success, false);
    assert.equal(resB.data.error, 'Conflict');
    // Ensure User A's transaction data was NOT leaked to User B
    assert.equal(resB.data.transaction, undefined, 'User A transaction must not be leaked to User B');

    // Confirm User B's portfolio remains untouched
    const portB = await apiGetPortfolio(userB);
    const infyInB = portB.data.portfolio.positions.find((p) => p.symbol === 'INFY');
    assert.equal(infyInB?.quantity, 35, 'User B position quantity must remain at baseline default (35 shares, not 40)');
    assert.equal(portB.data.transactions.length, 0, 'User B must have 0 transactions recorded in ledger');
  });
});

