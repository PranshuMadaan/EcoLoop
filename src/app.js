import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import eprRoutes from './routes/eprRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import iwlRoutes from './routes/iwlRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import ivrRoutes from './routes/ivrRoutes.js';
import municipalRoutes from './routes/municipalRoutes.js';
import optimizerRoutes from './routes/optimizerRoutes.js';
import { pingDatabase } from './config/db.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, '../frontend/dist');

const app = express();

// ============================================================================
// Core Middleware Configuration
// ============================================================================

// Enable Cross-Origin Resource Sharing with credentials support for cookies
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Cookie Parser Middleware with secret key for signed cookies
app.use(cookieParser(process.env.COOKIE_SECRET || 'ecoloop_secure_cookie_signer_secret'));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ============================================================================
// Health Check Route
// ============================================================================
app.get('/health', async (req, res, next) => {
  try {
    const dbStatus = await pingDatabase();
    return res.status(200).json({
      success: true,
      data: {
        service: 'EcoLoop B2B Scrap Marketplace API',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: 'UP',
          name: dbStatus.database,
          db_time: dbStatus.timestamp,
          latency_ms: dbStatus.latencyMs,
        },
      },
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      error: 'Database service is degraded or unreachable',
      data: {
        service: 'EcoLoop B2B Scrap Marketplace API',
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: 'DOWN',
          error_message: err.message,
        },
      },
    });
  }
});

// Serve static frontend assets if build exists (index: false preserves GET / API root)
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false }));
}

// Root Route: Frontend for browser navigations (text/html), API welcome JSON for API clients
app.get('/', (req, res, next) => {
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
  if (acceptsHtml && fs.existsSync(path.join(frontendDist, 'index.html'))) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  return res.status(200).json({
    success: true,
    data: {
      message: 'Welcome to EcoLoop B2B Digital Scrap Marketplace API (Phase 1.5 + Phase 2)',
      docs: '/api/v1',
      health: '/health',
      modules: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        listings: '/api/v1/listings',
        epr: '/api/v1/epr',
        workers: '/api/v1/workers',
        iwl: '/api/v1/iwl',
        marketplace: '/api/v1/marketplace',
        ivr: '/api/v1/ivr (Tier-1 phone intake, TwiML)',
        municipal: '/api/v1/municipal (Tier-2 direct-sale counters)',
      },
    },
  });
});

// ============================================================================
// API Route Registration (v1)
// ============================================================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/epr', eprRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/iwl', iwlRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/ivr', ivrRoutes);
app.use('/api/v1/municipal', municipalRoutes);
app.use('/api/v1/optimizer', optimizerRoutes);
app.use('/api/v1', optimizerRoutes);
app.use('/api', optimizerRoutes);

// SPA client-side fallback: serve index.html for non-API GET requests
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api') && fs.existsSync(path.join(frontendDist, 'index.html'))) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  next(new AppError(`Endpoint '${req.originalUrl}' not found on this server.`, 404));
});

// Catch-all route for unhandled endpoints
app.all('*', (req, res, next) => {
  next(new AppError(`Endpoint '${req.originalUrl}' not found on this server.`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
