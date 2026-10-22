import mongoose from 'mongoose';

/**
 * Checks if MONGODB_URI is properly populated and not using default placeholders.
 */
export const isDatabaseConfigured = () => {
  const uri = process.env.MONGODB_URI;
  return Boolean(
    uri &&
    !uri.includes('<username>') &&
    !uri.includes('<password>') &&
    uri.trim() !== ''
  );
};

/**
 * Connects to MongoDB database instance using MONGODB_URI from environment.
 * Sets 5-second timeout to avoid indefinite hanging.
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!isDatabaseConfigured()) {
    const errorMsg =
      'Missing or unconfigured MONGODB_URI in server/.env. Replace placeholders with valid MongoDB Atlas credentials.';
    console.warn(`[Database Notice] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Atlas connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

/**
 * Returns current database connection status details.
 */
export const getDatabaseStatus = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateCode = mongoose.connection.readyState;
  const configured = isDatabaseConfigured();

  return {
    stateCode,
    status: stateMap[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    isConfigured: configured,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};
