import { pool } from '../src/config/db.js';

async function migrateUsers() {
  console.log('[Migration] Connecting to Neon PostgreSQL...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('[Migration] 1. Updating column types and adding missing columns...');
    await client.query(`
      ALTER TABLE users ALTER COLUMN mobile_number TYPE VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ward_number VARCHAR(50);
    `);

    // Add unique constraint on email if not already present
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
        END IF;
      END $$;
    `);

    console.log('[Migration] 2. Populating full_name for existing users...');
    await client.query(`
      UPDATE users 
      SET full_name = COALESCE(full_name, organization_name, upi_bank_account_holder, 'EcoLoop Member') 
      WHERE full_name IS NULL;
      
      ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
    `);

    console.log('[Migration] 3. Migrating role values to standard enum format...');
    await client.query(`
      UPDATE users SET role = 'WASTE_PICKER' WHERE role = 'Picker';
      UPDATE users SET role = 'DWCC_OPERATOR' WHERE role = 'DWCC';
      UPDATE users SET role = 'RECYCLER' WHERE role = 'Recycler';
      UPDATE users SET role = 'ULB_OFFICIAL' WHERE role = 'ULB';
      UPDATE users SET role = 'CITIZEN' WHERE role IN ('Citizen', 'CITIZEN_HOUSEHOLD');
    `);

    console.log('[Migration] 4. Updating role check constraint...');
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('ULB_OFFICIAL', 'DWCC_OPERATOR', 'RECYCLER', 'WASTE_PICKER', 'CITIZEN'));
    `);

    console.log('[Migration] 5. Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await client.query('COMMIT');
    console.log('[Migration] Successfully migrated users table on Neon PostgreSQL!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateUsers();
