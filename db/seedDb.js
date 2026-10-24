import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const seedPath = path.join(__dirname, 'seed.sql');
  console.log(`[DB Seed] Reading seed data from: ${seedPath}`);

  try {
    const sql = await fs.readFile(seedPath, 'utf-8');
    console.log('[DB Seed] Inserting seed data into database...');
    await pool.query(sql);
    console.log('[DB Seed] Mock seed data populated successfully!');
  } catch (err) {
    console.error('[DB Seed Error]: Failed to populate seed data:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSeed();
