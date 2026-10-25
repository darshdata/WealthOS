import { z } from 'zod';
import mongoose from 'mongoose';
import Portfolio from '../models/Portfolio.js';
import Transaction from '../models/Transaction.js';
import PortfolioSnapshot from '../models/PortfolioSnapshot.js';
import {
  createDailySnapshotForUser,
  seedHistoricalSnapshotsForUser,
} from '../services/snapshotService.js';
import { getServerMarketPrice } from '../services/marketPriceService.js';
import {
  connectDB,
  isDatabaseConfigured,
  getCleanMongoUri,
  getDatabaseStatus,
} from '../config/database.js';

// Default initial positions when auto-seeding a fresh portfolio
const DEFAULT_POSITIONS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy & Conglomerate',
    quantity: 25,
    avgBuyPricePaise: 284000, // ₹2,840.00
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    sector: 'IT Services & Consulting',
    quantity: 15,
    avgBuyPricePaise: 375000, // ₹3,750.00
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financial Services',
    quantity: 40,
    avgBuyPricePaise: 162000, // ₹1,620.00
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    sector: 'IT Services & Consulting',
    quantity: 35,
    avgBuyPricePaise: 148000, // ₹1,480.00
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd.',
    sector: 'Consumer Internet & Logistics',
    quantity: 250,
    avgBuyPricePaise: 19250, // ₹192.50
  },
];

// Active market catalog instruments supported by WealthOS
export const VALID_MARKET_SYMBOLS = new Set([
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ZOMATO',
  'PAYTM',
  'TATAMOTORS',
  'ICICIBANK',
]);

// Zod schema for trade execution payload validation
const tradeInputSchema = z.object({
  idempotencyKey: z
    .string({ required_error: 'idempotencyKey is required' })
    .min(1, 'idempotencyKey cannot be empty')
    .trim(),
  symbol: z
    .string({ required_error: 'symbol is required' })
    .min(1, 'symbol cannot be empty')
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => VALID_MARKET_SYMBOLS.has(val), {
      message: 'Unknown or unsupported symbol. Must be an active market instrument.',
    }),
  name: z.string().optional().default(''),
  sector: z.string().optional().default('Diversified'),
  type: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: "Trade type must be either 'BUY' or 'SELL'" }),
  }),
  quantity: z
    .number({ required_error: 'quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than zero'),
  pricePaise: z
    .number()
    .int('pricePaise must be an integer')
    .positive('pricePaise must be greater than zero')
    .optional(),
});

/**
 * Checks if MongoDB is connected.
 * Returns boolean.
 */
const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Ensures MongoDB is connected on-demand (critical for serverless runtimes).
 */
const ensureDbConnection = async () => {
  if (isDbConnected()) return true;
  if (isDatabaseConfigured()) {
    try {
      await connectDB();
      return isDbConnected();
    } catch (err) {
      console.warn(`[Controller Database Reconnect Failed]: ${err.message}`);
      return false;
    }
  }
  return false;
};

const getDbErrorMessage = () => {
  const status = getDatabaseStatus();
  if (!isDatabaseConfigured()) {
    const uri = getCleanMongoUri();
    if (uri && !uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return 'Invalid MONGODB_URI in Vercel settings. Ensure connection string starts with mongodb+srv:// or mongodb:// (no extra text).';
    }
    return 'MongoDB is disconnected. Please configure MONGODB_URI in Vercel Project Settings > Environment Variables, then redeploy.';
  }

  if (status.lastError) {
    if (
      status.lastError.includes('whitelisted') ||
      status.lastError.includes('whitelist') ||
      status.lastError.includes('Could not connect to any servers')
    ) {
      return 'MongoDB Atlas Network Access Blocked: Vercel serverless IPs are not whitelisted. In MongoDB Atlas, go to Network Access -> Add IP Address -> Add 0.0.0.0/0 (Allow Access from Anywhere as Permanent).';
    }
    if (status.lastError.includes('bad auth') || status.lastError.includes('Authentication failed')) {
      return 'MongoDB Atlas Authentication Failed: Bad username or password in MONGODB_URI in Vercel settings.';
    }
  }

  return 'MongoDB Atlas is disconnected. Verify MONGODB_URI in Vercel settings and ensure 0.0.0.0/0 is allowed in Atlas Network Access.';
};

const checkDatabaseReady = async (res) => {
  if (isDbConnected()) return true;
  const connected = await ensureDbConnection();
  if (connected) return true;
  res.status(503).json({
    success: false,
    error: 'Database Unavailable',
    message: getDbErrorMessage(),
  });
  return false;
};

/**
 * Resolves trusted user identifier.
 * In production, extracts from authenticated session (req.user) to prevent untrusted spoofing.
 * In development and testing, allows headers/query overrides for test isolation.
 */
export const resolveTrustedUserId = (req) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.user && req.user.id) {
      return req.user.id;
    }
    return 'demo-user';
  }
  return req.headers['x-user-id'] || req.query.userId || req.body?.userId || 'demo-user';
};

const getUserId = resolveTrustedUserId;

/**
 * GET /api/portfolio
 * Retrieves user portfolio state and recent 20 ledger transactions.
 * Auto-seeds portfolio if no record exists.
 */
export const getPortfolio = async (req, res, next) => {
  try {
    if (!(await checkDatabaseReady(res))) return;

    const userId = getUserId(req);

    // Find or auto-seed portfolio
    let portfolio = await Portfolio.findOne({ userId });

    if (!portfolio) {
      portfolio = await Portfolio.create({
        userId,
        cashBalancePaise: 25000000, // ₹2,50,000
        positions: DEFAULT_POSITIONS,
      });
    }

    // Retrieve recent 20 transactions
    const transactions = await Transaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      portfolio: {
        userId: portfolio.userId,
        cashBalancePaise: portfolio.cashBalancePaise,
        positions: portfolio.positions,
        updatedAt: portfolio.updatedAt,
      },
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Executes work inside a MongoDB session transaction if replica set transactions are supported,
 * or runs directly as fallback if standalone.
 */
const executeWithTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    session = null;
  }

  if (session) {
    try {
      let result;
      await session.withTransaction(async () => {
        result = await workFn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  } else {
    return await workFn(null);
  }
};

/**
 * POST /api/portfolio/trade
 * Executes BUY or SELL order with Zod validation, multi-document atomic transaction,
 * idempotency caching, race-condition protection, and immutable ledger recording.
 */
export const executeTrade = async (req, res, next) => {
  try {
    if (!(await checkDatabaseReady(res))) return;

    // 1. Zod input validation
    const validationResult = tradeInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: issue.message,
        details: validationResult.error.flatten(),
      });
    }

    const { idempotencyKey, symbol, name, sector, type, quantity, pricePaise } =
      validationResult.data;
    const userId = getUserId(req);

    // 2. Authoritative Server Market Price Resolution & Circuit Limit Band (±20%)
    const serverRef = getServerMarketPrice(symbol);
    const refPricePaise = serverRef.pricePaise;

    let executionPricePaise = refPricePaise;
    if (typeof pricePaise === 'number') {
      const minAllowedPaise = Math.round(refPricePaise * 0.8);
      const maxAllowedPaise = Math.round(refPricePaise * 1.2);

      if (pricePaise < minAllowedPaise || pricePaise > maxAllowedPaise) {
        return res.status(400).json({
          success: false,
          error: 'Circuit Limit Violation',
          message: `Execution price ${pricePaise} paise violates the daily circuit limit band (±20% of reference price ₹${(refPricePaise / 100).toFixed(2)}). Order rejected.`,
        });
      }
      executionPricePaise = pricePaise;
    }

    // 3. Pre-check idempotency outside transaction with account ownership verification
    const cachedTx = await Transaction.findOne({ idempotencyKey }).lean();
    if (cachedTx) {
      if (cachedTx.userId !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'Idempotency key has already been used by another account.',
        });
      }
      const currentPortfolio = await Portfolio.findOne({ userId }).lean();
      return res.status(200).json({
        success: true,
        message: 'Idempotent request: cached transaction returned without re-execution',
        transaction: cachedTx,
        portfolio: currentPortfolio,
        isDuplicate: true,
      });
    }

    // 4. Execute trade inside multi-document atomic transaction
    const totalValuePaise = quantity * executionPricePaise;

    try {
      const tradeResult = await executeWithTransaction(async (session) => {
        // Double-check idempotency inside session to prevent race conditions
        const inSessionTx = session
          ? await Transaction.findOne({ idempotencyKey }).session(session).lean()
          : await Transaction.findOne({ idempotencyKey }).lean();

        if (inSessionTx) {
          if (inSessionTx.userId !== userId) {
            return {
              statusCode: 409,
              body: {
                success: false,
                error: 'Conflict',
                message: 'Idempotency key has already been used by another account.',
              },
            };
          }
          const currentPortfolio = session
            ? await Portfolio.findOne({ userId }).session(session).lean()
            : await Portfolio.findOne({ userId }).lean();

          return {
            statusCode: 200,
            body: {
              success: true,
              message: 'Idempotent request: cached transaction returned without re-execution',
              transaction: inSessionTx,
              portfolio: currentPortfolio,
              isDuplicate: true,
            },
          };
        }

        // Find or auto-create Portfolio inside session
        let portfolio = session
          ? await Portfolio.findOne({ userId }).session(session)
          : await Portfolio.findOne({ userId });

        if (!portfolio) {
          if (session) {
            const created = await Portfolio.create(
              [
                {
                  userId,
                  cashBalancePaise: 25000000,
                  positions: DEFAULT_POSITIONS,
                },
              ],
              { session }
            );
            portfolio = created[0];
          } else {
            portfolio = await Portfolio.create({
              userId,
              cashBalancePaise: 25000000,
              positions: DEFAULT_POSITIONS,
            });
          }
        }

        // Business Logic: BUY
        if (type === 'BUY') {
          if (portfolio.cashBalancePaise < totalValuePaise) {
            return {
              statusCode: 400,
              body: {
                success: false,
                error: 'Insufficient Funds',
                message: `Cannot execute BUY. Required: ₹${(totalValuePaise / 100).toLocaleString('en-IN')}, Available: ₹${(
                  portfolio.cashBalancePaise / 100
                ).toLocaleString('en-IN')}`,
              },
            };
          }

          // Deduct cash balance
          portfolio.cashBalancePaise -= totalValuePaise;

          // Update or insert position with weighted average buy price
          const existingPosIndex = portfolio.positions.findIndex(
            (p) => p.symbol.toUpperCase() === symbol
          );

          if (existingPosIndex >= 0) {
            const existing = portfolio.positions[existingPosIndex];
            const newQty = existing.quantity + quantity;
            const newAvgPaise = Math.round(
              (existing.quantity * existing.avgBuyPricePaise + totalValuePaise) / newQty
            );

            portfolio.positions[existingPosIndex].quantity = newQty;
            portfolio.positions[existingPosIndex].avgBuyPricePaise = newAvgPaise;
            if (name) portfolio.positions[existingPosIndex].name = name;
            if (sector) portfolio.positions[existingPosIndex].sector = sector;
          } else {
            portfolio.positions.push({
              symbol,
              name: name || symbol,
              sector: sector || 'Diversified',
              quantity,
              avgBuyPricePaise: executionPricePaise,
            });
          }
        } else if (type === 'SELL') {
          // Business Logic: SELL
          const existingPosIndex = portfolio.positions.findIndex(
            (p) => p.symbol.toUpperCase() === symbol
          );

          if (existingPosIndex < 0 || portfolio.positions[existingPosIndex].quantity < quantity) {
            const owned = existingPosIndex >= 0 ? portfolio.positions[existingPosIndex].quantity : 0;
            return {
              statusCode: 400,
              body: {
                success: false,
                error: 'Insufficient Holdings',
                message: `Cannot execute SELL. Owned: ${owned} shares of ${symbol}, Requested: ${quantity} shares`,
              },
            };
          }

          // Credit proceeds to cash balance
          portfolio.cashBalancePaise += totalValuePaise;

          const existing = portfolio.positions[existingPosIndex];
          const remainingQty = existing.quantity - quantity;

          if (remainingQty === 0) {
            portfolio.positions.splice(existingPosIndex, 1);
          } else {
            portfolio.positions[existingPosIndex].quantity = remainingQty;
          }
        }

        // Create immutable Transaction ledger document
        const transaction = new Transaction({
          userId,
          idempotencyKey,
          symbol,
          type,
          quantity,
          executionPricePaise,
          totalValuePaise,
          status: 'COMPLETED',
          timestamp: new Date(),
        });

        // Save atomically inside the session
        if (session) {
          await portfolio.save({ session });
          await transaction.save({ session });
        } else {
          await portfolio.save();
          await transaction.save();
        }

        return {
          statusCode: 201,
          body: {
            success: true,
            message: `${type} order executed successfully`,
            portfolio: {
              userId: portfolio.userId,
              cashBalancePaise: portfolio.cashBalancePaise,
              positions: portfolio.positions,
              updatedAt: portfolio.updatedAt,
            },
            transaction,
          },
        };
      });

      return res.status(tradeResult.statusCode).json(tradeResult.body);
    } catch (txError) {
      // Catch concurrent race duplicate key errors on idempotencyKey (E11000)
      if (
        txError.code === 11000 ||
        txError.message?.includes('E11000') ||
        txError.message?.includes('duplicate key')
      ) {
        // Enforce account isolation: only return if the key belongs to this user
        const existingTx = await Transaction.findOne({ idempotencyKey, userId }).lean();
        if (existingTx) {
          const currentPortfolio = await Portfolio.findOne({ userId }).lean();
          return res.status(200).json({
            success: true,
            message: 'Idempotent request: concurrent race resolved via unique index',
            transaction: existingTx,
            portfolio: currentPortfolio,
            isDuplicate: true,
          });
        }
        const otherUserTx = await Transaction.findOne({ idempotencyKey }).lean();
        if (otherUserTx && otherUserTx.userId !== userId) {
          return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: 'Idempotency key has already been used by another account.',
          });
        }
      }
      throw txError;
    }
  } catch (error) {
    next(error);
  }
};

// Zod validation schema for snapshot query parameters
const snapshotQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
    .optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 30))
    .refine((val) => Number.isInteger(val) && val >= 1 && val <= 365, {
      message: 'limit must be an integer between 1 and 365',
    }),
});

/**
 * GET /api/portfolio/snapshots
 * Retrieves validated chronological historical portfolio snapshots.
 * Supports startDate, endDate, and limit filters.
 */
export const getPortfolioSnapshots = async (req, res, next) => {
  try {
    if (!(await checkDatabaseReady(res))) return;

    const parseResult = snapshotQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: issue.message,
        details: parseResult.error.flatten(),
      });
    }

    const { startDate, endDate, limit } = parseResult.data;
    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'startDate cannot be after endDate',
      });
    }

    const userId = resolveTrustedUserId(req);

    // Build chronological query
    const filter = { userId };
    if (startDate || endDate) {
      filter.valuationDate = {};
      if (startDate) filter.valuationDate.$gte = startDate;
      if (endDate) filter.valuationDate.$lte = endDate;
    }

    const snapshots = await PortfolioSnapshot.find(filter)
      .sort({ valuationDate: 1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: snapshots.length,
      snapshots,
      isPersistedHistory: true,
      message:
        snapshots.length > 0
          ? 'Persisted portfolio valuation snapshots retrieved successfully.'
          : 'No historical snapshots found for user and date criteria.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/portfolio/snapshots/trigger
 * Manually triggers daily snapshot or seeds historical snapshots for development/testing.
 * Protected in production environments if ADMIN_KEY is configured.
 */
export const triggerPortfolioSnapshot = async (req, res, next) => {
  try {
    if (!(await checkDatabaseReady(res))) return;

    // Protect in production if administrative key is explicitly configured
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ADMIN_KEY &&
      req.headers['x-admin-key'] !== process.env.ADMIN_KEY
    ) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Manual snapshot triggering is restricted in production environments.',
      });
    }

    const userId = resolveTrustedUserId(req);
    const { seedDays, notes } = req.body || {};

    // Auto-seed portfolio if not already present
    let portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      portfolio = await Portfolio.create({
        userId,
        cashBalancePaise: 25000000,
        positions: DEFAULT_POSITIONS,
      });
    }

    if (seedDays && Number(seedDays) > 0) {
      const count = Math.min(60, Math.max(1, parseInt(seedDays, 10)));
      const seeded = await seedHistoricalSnapshotsForUser(userId, count);
      return res.status(200).json({
        success: true,
        message: `Successfully seeded ${seeded.length} historical daily snapshots for user '${userId}'.`,
        count: seeded.length,
        snapshots: seeded,
      });
    } else {
      const snapshot = await createDailySnapshotForUser(userId, { notes });
      return res.status(200).json({
        success: true,
        message: `Daily valuation snapshot recorded for ${snapshot.valuationDate} (Asia/Kolkata).`,
        snapshot,
      });
    }
  } catch (error) {
    next(error);
  }
};

