import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, isDatabaseConfigured } from './config/database.js';
import { initSnapshotScheduler } from './services/snapshotService.js';

const PORT = process.env.PORT || 5000;

/**
 * Initializes database connection if configured, then starts Express HTTP listener.
 * If credentials are not yet configured, starts in standalone mode and exposes
 * diagnostic health endpoints for Sprint 1 verification.
 */
const startServer = async () => {
  if (isDatabaseConfigured()) {
    try {
      console.log('[WealthOS] Connecting to MongoDB Atlas...');
      await connectDB();
      initSnapshotScheduler();
    } catch (error) {
      console.warn(`[WealthOS Warning] MongoDB connection attempt failed: ${error.message}`);
      console.warn('[WealthOS Warning] Server starting in standalone mode. Use /api/health/database to verify status.');
    }
  } else {
    console.log('============================================================');
    console.log(' [WealthOS Notice: MongoDB Pending URI Configuration]');
    console.log(' Server is running in STANDALONE API mode.');
    console.log(' Configure MONGODB_URI in server/.env with your Atlas connection string.');
    console.log('============================================================');
  }

  app.listen(PORT, () => {
    console.log(`[WealthOS API] Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    console.log(`[WealthOS API] Liveness probe: http://localhost:${PORT}/api/health`);
    console.log(`[WealthOS API] Database probe: http://localhost:${PORT}/api/health/database`);
    console.log(`[WealthOS API] Portfolio API:  http://localhost:${PORT}/api/portfolio`);
    console.log(`[WealthOS API] Snapshots API:  http://localhost:${PORT}/api/portfolio/snapshots`);
  });
};

startServer();
