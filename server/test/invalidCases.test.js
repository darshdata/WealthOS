import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetPortfolio,
  apiExecuteTrade,
  generateTestUserId,
  generateIdempotencyKey,
} from './testHelper.js';

describe('Invalid Cases & Business Rule Rejection Tests', () => {
  test('Zero and negative quantities are rejected with HTTP 400', async () => {
    const testUserId = generateTestUserId('invalid-qty');

    // Test zero quantity
    const zeroRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 0,
      pricePaise: 290000,
    });
    assert.equal(zeroRes.status, 400, 'Quantity 0 must return HTTP 400');
    assert.equal(zeroRes.data.success, false);

    // Test negative quantity
    const negRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: -10,
      pricePaise: 290000,
    });
    assert.equal(negRes.status, 400, 'Negative quantity must return HTTP 400');
    assert.equal(negRes.data.success, false);

    // Test fractional quantity
    const fracRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 5.5,
      pricePaise: 290000,
    });
    assert.equal(fracRes.status, 400, 'Fractional quantity must return HTTP 400');
    assert.equal(fracRes.data.success, false);
  });

  test('Unknown and invalid symbols are rejected with HTTP 400', async () => {
    const testUserId = generateTestUserId('invalid-sym');

    // Unknown symbol
    const unknownRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'NON_EXISTENT_COMPANY',
      type: 'BUY',
      quantity: 10,
      pricePaise: 10000,
    });
    assert.equal(unknownRes.status, 400, 'Unknown symbol must return HTTP 400');
    assert.equal(unknownRes.data.success, false);

    // Empty symbol
    const emptyRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: '',
      type: 'BUY',
      quantity: 10,
      pricePaise: 10000,
    });
    assert.equal(emptyRes.status, 400, 'Empty symbol must return HTTP 400');
    assert.equal(emptyRes.data.success, false);
  });

  test('Insufficient cash for BUY is rejected with HTTP 400 Insufficient Funds', async () => {
    const testUserId = generateTestUserId('low-cash');
    const initialRes = await apiGetPortfolio(testUserId);
    const cash = initialRes.data.portfolio.cashBalancePaise; // 2,50,00,000 paise

    // Attempt to buy shares costing more than cash balance
    // 1000 shares of RELIANCE @ 300000 paise = 30,00,00,000 paise (> 2,50,00,000)
    const overbuyRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 1000,
      pricePaise: 300000,
    });

    assert.equal(overbuyRes.status, 400, 'Insufficient funds must return HTTP 400');
    assert.equal(overbuyRes.data.success, false);
    assert.equal(overbuyRes.data.error, 'Insufficient Funds');

    // Verify cash balance was not modified
    const postRes = await apiGetPortfolio(testUserId);
    assert.equal(postRes.data.portfolio.cashBalancePaise, cash, 'Cash balance must remain unchanged');
  });

  test('Insufficient shares for SELL is rejected with HTTP 400 Insufficient Holdings', async () => {
    const testUserId = generateTestUserId('low-shares');
    const initialRes = await apiGetPortfolio(testUserId);
    const reliance = initialRes.data.portfolio.positions.find((p) => p.symbol === 'RELIANCE');
    const ownedQty = reliance.quantity; // 25

    // Attempt to sell more shares than owned (e.g. 100 shares)
    const oversellRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'SELL',
      quantity: ownedQty + 100,
      pricePaise: 300000,
    });

    assert.equal(oversellRes.status, 400, 'Overselling must return HTTP 400');
    assert.equal(oversellRes.data.success, false);
    assert.equal(oversellRes.data.error, 'Insufficient Holdings');

    // Attempt to sell an unowned instrument
    const unownedRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'PAYTM',
      type: 'SELL',
      quantity: 1,
      pricePaise: 42580,
    });

    assert.equal(unownedRes.status, 400, 'Selling unowned stock must return HTTP 400');
    assert.equal(unownedRes.data.error, 'Insufficient Holdings');
  });

  test('Malformed requests are rejected with HTTP 400 Validation Error', async () => {
    const testUserId = generateTestUserId('malformed');

    // Missing idempotencyKey
    const noKeyRes = await apiExecuteTrade(testUserId, {
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 1,
      pricePaise: 290000,
    });
    assert.equal(noKeyRes.status, 400, 'Missing idempotencyKey must return HTTP 400');

    // Invalid trade type ('HOLD')
    const badTypeRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'HOLD',
      quantity: 1,
      pricePaise: 290000,
    });
    assert.equal(badTypeRes.status, 400, 'Invalid type must return HTTP 400');

    // Non-numeric or negative price
    const badPriceRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 1,
      pricePaise: -500,
    });
    assert.equal(badPriceRes.status, 400, 'Negative price must return HTTP 400');
  });

  test('Client-supplied execution prices outside ±20% circuit limit band are rejected with HTTP 400', async () => {
    const testUserId = generateTestUserId('circuit-limit');

    // Attempt to buy with price far below circuit lower bound (₹1.00 / 100 paise vs ref ~₹2940)
    const lowPriceRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'BUY',
      quantity: 1,
      pricePaise: 100,
    });
    assert.equal(lowPriceRes.status, 400, 'Artificially depressed price must return HTTP 400');
    assert.equal(lowPriceRes.data.success, false);
    assert.equal(lowPriceRes.data.error, 'Circuit Limit Violation');

    // Attempt to sell with price far above circuit upper bound (₹10,000.00 / 1000000 paise vs ref ~₹2940)
    const highPriceRes = await apiExecuteTrade(testUserId, {
      idempotencyKey: generateIdempotencyKey(),
      symbol: 'RELIANCE',
      type: 'SELL',
      quantity: 1,
      pricePaise: 1000000,
    });
    assert.equal(highPriceRes.status, 400, 'Artificially inflated price must return HTTP 400');
    assert.equal(highPriceRes.data.success, false);
    assert.equal(highPriceRes.data.error, 'Circuit Limit Violation');
  });
});

