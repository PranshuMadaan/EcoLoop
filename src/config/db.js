import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Construct pool configuration: preferentially use DATABASE_URL if present,
// falling back to granular parameters.
const shouldUseSsl =
  process.env.NODE_ENV === 'production' ||
  (process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('sslmode=require'))) ||
  process.env.PGSSL === 'true';

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_MAX_POOL) || 20,
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'ecoloop_db',
      max: Number(process.env.PG_MAX_POOL) || 20,
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    };

export const pool = new Pool(poolConfig);

// Handle idle connection drops and unexpected errors gracefully
pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected idle client error:', err.message);
});

pool.on('connect', () => {
  // Connection acquired successfully
});

/**
 * Execute a parameterized SQL query
 * @param {string} text - SQL statement with $1, $2 placeholders
 * @param {Array} [params] - Bound parameters
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Acquire a client from the pool for transactions
 * @returns {Promise<pg.PoolClient>}
 */
export const getClient = () => pool.connect();

/**
 * Helper to ping database for health checks
 * @returns {Promise<{ ok: boolean, timestamp: string, latencyMs: number }>}
 */
export const pingDatabase = async () => {
  const start = Date.now();
  const result = await pool.query('SELECT NOW() as db_time, current_database() as database');
  const latencyMs = Date.now() - start;
  return {
    ok: true,
    timestamp: result.rows[0].db_time,
    database: result.rows[0].database,
    latencyMs,
  };
};

export default {
  pool,
  query,
  getClient,
  pingDatabase,
};
