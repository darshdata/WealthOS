/**
 * Test helper for WealthOS trade engine regression tests.
 * Communicates with the live Express 5 API running on port 5001.
 */

export const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/api';

/**
 * Generates a unique isolated test user ID for each test case.
 * Ensures tests NEVER touch or pollute the demo portfolio.
 */
export const generateTestUserId = (prefix = 'test-user') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

/**
 * Generates a unique idempotency key.
 */
export const generateIdempotencyKey = () => {
  return `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Helper to fetch portfolio for a specific user ID.
 */
export const apiGetPortfolio = async (userId) => {
  const res = await fetch(`${BASE_URL}/portfolio`, {
    headers: {
      'x-user-id': userId,
      Accept: 'application/json',
    },
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
};

/**
 * Helper to execute a trade for a specific user ID.
 */
export const apiExecuteTrade = async (userId, payload) => {
  const res = await fetch(`${BASE_URL}/portfolio/trade`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
};

/**
 * Helper to probe database health.
 */
export const apiGetDatabaseHealth = async () => {
  const res = await fetch(`${BASE_URL}/health/database`);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
};

/**
 * Helper to fetch historical snapshots for a user.
 */
export const apiGetSnapshots = async (userId, queryParams = {}) => {
  const query = new URLSearchParams(queryParams).toString();
  const url = `${BASE_URL}/portfolio/snapshots${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'x-user-id': userId,
      Accept: 'application/json',
    },
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
};

/**
 * Helper to manually trigger snapshot creation or seeding.
 */
export const apiTriggerSnapshot = async (userId, body = {}, headers = {}) => {
  const res = await fetch(`${BASE_URL}/portfolio/snapshots/trigger`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
};
