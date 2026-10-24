import dotenv from 'dotenv';
import app from './src/app.js';
import { pool } from './src/config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`♻️  EcoLoop Backend (Phase 1) is running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Users API: http://localhost:${PORT}/api/v1/users`);
  console.log(`📦 Listings API: http://localhost:${PORT}/api/v1/listings`);
  console.log(`========================================================`);
});

// ============================================================================
// Graceful Shutdown Handling
// ============================================================================
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Closing HTTP server and database pool...`);
  
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
      await pool.end();
      console.log('[Database] Connection pool cleanly closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Database Error] Error during pool termination:', err.message);
      process.exit(1);
    }
  });

  // Force termination after 5 seconds if connections linger
  setTimeout(() => {
    console.error('[Server] Forcefully terminating after timeout.');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
