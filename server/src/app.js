import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';

const app = express();

// Configure CORS for local development client
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Standard JSON and URL-encoded parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'WealthOS Institutional API',
    version: '1.0.0',
    description: 'WealthOS MERN Investment Portfolio & Order Execution Engine',
    endpoints: {
      health: '/api/health',
      databaseHealth: '/api/health/database',
      portfolio: '/api/portfolio',
      trade: '/api/portfolio/trade',
    },
  });
});

// Mount aggregated API router (/api/health and /api/portfolio)
app.use('/api', apiRoutes);

// Fallback 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Structured application error handler (safe error output without stack leaks)
app.use((err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred processing your request.',
  });
});

export default app;
