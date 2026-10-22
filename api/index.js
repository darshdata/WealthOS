import mongoose from 'mongoose';
import app from '../server/src/app.js';
import { connectDB, isDatabaseConfigured } from '../server/src/config/database.js';

/**
 * Vercel Serverless Function entry point for WealthOS API.
 * Connects to MongoDB Atlas if configured and routes requests to the Express application.
 */
export default async function handler(req, res) {
  if (isDatabaseConfigured() && mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[Vercel Serverless] MongoDB connection error:', err.message);
    }
  }

  return app(req, res);
}
