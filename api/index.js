import app from '../server/src/app.js';
import { connectDB, isDatabaseConfigured } from '../server/src/config/database.js';

let isConnected = false;

/**
 * Vercel Serverless Function entry point for WealthOS API.
 * Connects to MongoDB Atlas if configured and routes requests to the Express application.
 */
export default async function handler(req, res) {
  if (!isConnected && isDatabaseConfigured()) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('[Vercel Serverless] MongoDB connection error:', err.message);
    }
  }

  return app(req, res);
}
