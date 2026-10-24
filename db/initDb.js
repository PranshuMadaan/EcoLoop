import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSchemaMigration() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log(`[DB Init] Reading schema definition from: ${schemaPath}`);

  try {
    const sql = await fs.readFile(schemaPath, 'utf-8');
    console.log('[DB Init] Applying schema migration to PostgreSQL...');
    await pool.query(sql);
    console.log('[DB Init] Schema migration applied successfully!');
  } catch (err) {
    console.error('[DB Init Error]: Failed to apply schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSchemaMigration();
