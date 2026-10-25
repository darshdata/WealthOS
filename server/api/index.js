import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, isDatabaseConfigured } from '../src/config/database.js';

/**
 * Vercel Serverless Function entry point for WealthOS standalone server deployment.
 * Connects to MongoDB Atlas if configured and routes all requests to Express app.
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
