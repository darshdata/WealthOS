import mongoose from 'mongoose';

let lastConnectionError = null;

/**
 * Sanitizes and cleans the MongoDB connection string.
 * Automatically extracts valid mongodb:// or mongodb+srv:// connection strings
 * even if prefixed with 'MONGODB_URI=', 'export', enclosed in quotes or angle brackets.
 */
export const getCleanMongoUri = () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) return '';
  uri = uri.trim();

  // Extract embedded connection string if pasted with key, export, quotes, or angle brackets
  const match = uri.match(/(mongodb(?:\+srv)?:\/\/[^\s"'>]+)/);
  if (match) {
    return match[1].trim();
  }

  // Fallback stripping quotes
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }
  return uri;
};

/**
 * Checks if MONGODB_URI is properly populated with a valid scheme and not using default placeholders.
 */
export const isDatabaseConfigured = () => {
  const uri = getCleanMongoUri();
  return Boolean(
    uri &&
    (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) &&
    !uri.includes('<username>') &&
    !uri.includes('<password>') &&
    !uri.includes('<Your MongoDB Atlas connection string>') &&
    uri.trim() !== ''
  );
};

/**
 * Connects to MongoDB database instance using MONGODB_URI from environment.
 * Sets 8-second timeout to accommodate serverless TLS handshakes to MongoDB Atlas.
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If already connecting, wait for existing connection attempt to complete
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 0 || Date.now() - start > 8000) {
          clearInterval(interval);
          resolve();
        }
      }, 150);
    });
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
  }

  const uri = getCleanMongoUri();

  if (!isDatabaseConfigured()) {
    let errorMsg =
      'Missing MONGODB_URI. In Vercel, set MONGODB_URI in Project Settings > Environment Variables, then redeploy.';
    if (uri && !uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      errorMsg =
        'Invalid MONGODB_URI scheme. The connection string must start with "mongodb+srv://" or "mongodb://".';
    } else if (uri && (uri.includes('<username>') || uri.includes('<password>') || uri.includes('<Your MongoDB Atlas connection string>'))) {
      errorMsg =
        'MONGODB_URI contains unreplaced placeholders like <password>. Please replace with your actual Atlas database user password.';
    }
    lastConnectionError = errorMsg;
    console.warn(`[Database Notice] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
    });
    lastConnectionError = null;
    console.log(`[Database] MongoDB Atlas connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    lastConnectionError = error.message;
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
  const rawUri = process.env.MONGODB_URI;

  return {
    stateCode,
    status: stateMap[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    isConfigured: configured,
    hasMongoUri: Boolean(rawUri && rawUri.trim().length > 0),
    lastError: lastConnectionError || null,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};
