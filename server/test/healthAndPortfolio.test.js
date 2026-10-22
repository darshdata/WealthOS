import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiGetDatabaseHealth,
  apiGetPortfolio,
  generateTestUserId,
} from './testHelper.js';

describe('System Health & Portfolio Retrieval Probes', () => {
  test('GET /api/health/database returns status: ok and connected database', async () => {
    const res = await apiGetDatabaseHealth();

    assert.equal(res.status, 200, 'Database health check must return HTTP 200');
    assert.equal(res.data.status, 'ok', 'Status must be ok');
    assert.equal(res.data.database, 'connected', 'Database must report connected');
    assert.equal(res.data.databaseName, 'wealthos', 'Database name must be wealthos');
    assert.ok(res.data.host, 'Host information must be returned');
  });

  test('GET /api/portfolio auto-seeds and returns portfolio structure for isolated user', async () => {
    const testUserId = generateTestUserId('health-user');
    const res = await apiGetPortfolio(testUserId);

    assert.equal(res.status, 200, 'Must return HTTP 200');
    assert.equal(res.data.success, true, 'success field must be true');
    assert.ok(res.data.portfolio, 'portfolio object must exist');
    assert.equal(res.data.portfolio.userId, testUserId, 'userId must match requested user');
    assert.equal(
      res.data.portfolio.cashBalancePaise,
      25000000,
      'Initial cash balance must be 2,50,00,000 paise (₹2,50,000)'
    );
    assert.ok(Array.isArray(res.data.portfolio.positions), 'positions must be an array');
    assert.ok(res.data.portfolio.positions.length > 0, 'default positions must be seeded');
    assert.ok(Array.isArray(res.data.transactions), 'transactions must be an array');
  });
});
