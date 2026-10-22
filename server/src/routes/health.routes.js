import { Router } from 'express';
import { getDatabaseStatus } from '../config/database.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Application liveness probe verifying HTTP layer is healthy
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'wealthos-api',
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/health/database
 * @desc    Database readiness check reporting current Mongoose connection status
 * @access  Public
 */
router.get('/database', (req, res) => {
  const dbStatus = getDatabaseStatus();

  if (dbStatus.isConnected) {
    return res.status(200).json({
      status: 'ok',
      database: dbStatus.status,
      host: dbStatus.host,
      databaseName: dbStatus.name,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'error',
    database: dbStatus.status,
    isConfigured: dbStatus.isConfigured,
    hasMongoUri: dbStatus.hasMongoUri,
    lastError: dbStatus.lastError,
    message: dbStatus.hasMongoUri
      ? (dbStatus.lastError || 'MongoDB Atlas connection failed. Ensure 0.0.0.0/0 is whitelisted in Atlas Network Access.')
      : 'MONGODB_URI is missing in environment variables. Add MONGODB_URI in Vercel Settings and trigger a Redeploy.',
    timestamp: new Date().toISOString(),
  });
});

export default router;
