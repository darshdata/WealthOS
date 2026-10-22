/**
 * WEALTHOS API CLIENT
 * 
 * Central HTTP client for Express 5 backend communications.
 * Interacts with MongoDB-backed portfolio balances, holdings, and trade execution ledger.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5001/api';

/**
 * Fetches user portfolio holdings and transaction ledger from backend.
 * 
 * @returns {Promise<{portfolio: object, transactions: Array}>}
 */
export const fetchPortfolio = async () => {
  const response = await fetch(`${API_BASE_URL}/portfolio`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    const error = new Error(errorData.message || 'Failed to fetch portfolio from server');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
};

/**
 * Submits an atomic BUY or SELL trade execution to backend with an idempotency key.
 * 
 * @param {object} tradePayload
 * @param {string} tradePayload.idempotencyKey - Unique idempotency identifier
 * @param {string} tradePayload.symbol - Instrument ticker symbol (e.g., 'RELIANCE')
 * @param {string} [tradePayload.name] - Company/asset name
 * @param {string} [tradePayload.sector] - Sector categorization
 * @param {'BUY'|'SELL'} tradePayload.type - Order side
 * @param {number} tradePayload.quantity - Shares to trade (positive integer)
 * @param {number} tradePayload.pricePaise - Unit price in integer paise
 * @returns {Promise<{success: boolean, portfolio: object, transaction: object, isDuplicate?: boolean}>}
 */
export const executeTradeApi = async (tradePayload) => {
  const response = await fetch(`${API_BASE_URL}/portfolio/trade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(tradePayload),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: `HTTP ${response.status}: ${response.statusText}` };
  }

  if (!response.ok) {
    const error = new Error(data.message || 'Trade execution failed on server');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Probes application and database health statuses.
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
};

export const checkDatabaseHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health/database`);
  return response.json();
};

/**
 * Fetches chronological historical portfolio snapshots from MongoDB Atlas.
 *
 * @param {Object} [params]
 * @param {string} [params.startDate] - YYYY-MM-DD
 * @param {string} [params.endDate] - YYYY-MM-DD
 * @param {number} [params.limit=30] - Max snapshots to fetch
 * @returns {Promise<{ success: boolean, count: number, snapshots: Array, isPersistedHistory: boolean }>}
 */
export const fetchHistoricalSnapshots = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.limit) query.set('limit', String(params.limit));

  const url = `${API_BASE_URL}/portfolio/snapshots${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    const error = new Error(errorData.message || 'Failed to fetch historical snapshots');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
};

/**
 * Manually triggers a valuation snapshot or seeds historical snapshots (Dev / Test).
 *
 * @param {Object} [payload]
 * @param {number} [payload.seedDays] - Number of past daily snapshots to seed
 * @param {string} [payload.notes] - Operational notes
 * @returns {Promise<{ success: boolean, message: string, snapshot?: object, snapshots?: Array }>}
 */
export const triggerSnapshotApi = async (payload = {}) => {
  const response = await fetch(`${API_BASE_URL}/portfolio/snapshots/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    const error = new Error(errorData.message || 'Snapshot trigger failed');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
};

