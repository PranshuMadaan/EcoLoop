-- ============================================================================
-- EcoLoop Module: Informal Worker Digital Ledger (IWL / IWF)
-- Schema Definition: Worker Profiles, Daily Weigh-In Logs & Instant Payout Receipts
-- ============================================================================

-- 1. Worker Profiles & Municipal Registration
CREATE TABLE IF NOT EXISTS worker_profiles (
  worker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  preferred_language VARCHAR(10) DEFAULT 'hi' CHECK (preferred_language IN ('hi', 'mr', 'kn', 'en', 'ta', 'te', 'bn')),
  municipal_id_number VARCHAR(100) UNIQUE,
  cooperative_affiliation VARCHAR(100), -- E.g., 'SWaCH Pune', 'Hasiru Dala'
  kyc_status VARCHAR(50) DEFAULT 'VERIFIED' CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')),
  qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for worker_profiles
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_qr_code_hash ON worker_profiles(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_municipal_id ON worker_profiles(municipal_id_number);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_cooperative ON worker_profiles(cooperative_affiliation);

-- 2. Daily Weigh-In Logs
CREATE TABLE IF NOT EXISTS worker_weigh_ins (
  weigh_in_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  dwcc_hub_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  material_grade VARCHAR(50) NOT NULL,
  gross_weight_kg NUMERIC(10, 2) NOT NULL CHECK (gross_weight_kg > 0),
  tare_weight_kg NUMERIC(10, 2) DEFAULT 0.00 CHECK (tare_weight_kg >= 0),
  net_weight_kg NUMERIC(10, 2) NOT NULL CHECK (net_weight_kg > 0),
  applied_rate_per_kg NUMERIC(10, 2) NOT NULL CHECK (applied_rate_per_kg >= 0),
  total_payable_inr NUMERIC(10, 2) NOT NULL CHECK (total_payable_inr >= 0),
  payout_status VARCHAR(50) DEFAULT 'PENDING' CHECK (payout_status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for worker_weigh_ins
CREATE INDEX IF NOT EXISTS idx_worker_weigh_ins_worker_id ON worker_weigh_ins(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_weigh_ins_dwcc_hub_id ON worker_weigh_ins(dwcc_hub_id);
CREATE INDEX IF NOT EXISTS idx_worker_weigh_ins_payout_status ON worker_weigh_ins(payout_status);
CREATE INDEX IF NOT EXISTS idx_worker_weigh_ins_created_at ON worker_weigh_ins(created_at DESC);

-- 3. Instant Payout Receipts
CREATE TABLE IF NOT EXISTS worker_payout_transactions (
  payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weigh_in_id UUID NOT NULL UNIQUE REFERENCES worker_weigh_ins(weigh_in_id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  amount_inr NUMERIC(10, 2) NOT NULL CHECK (amount_inr >= 0),
  seller_upi_vpa VARCHAR(255) NOT NULL,
  razorpay_payout_id VARCHAR(100) UNIQUE,
  utr_number VARCHAR(12) UNIQUE,
  transaction_status VARCHAR(50) DEFAULT 'PROCESSED' CHECK (transaction_status IN ('PENDING', 'PROCESSED', 'FAILED', 'REVERSED')),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for worker_payout_transactions
CREATE INDEX IF NOT EXISTS idx_worker_payout_transactions_weigh_in_id ON worker_payout_transactions(weigh_in_id);
CREATE INDEX IF NOT EXISTS idx_worker_payout_transactions_worker_id ON worker_payout_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payout_transactions_utr ON worker_payout_transactions(utr_number);
