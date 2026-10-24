-- ============================================================================
-- EcoLoop Build #3: Government Auction Competitive Differentiators Schema
-- Upgrading /api/v1/marketplace with 5 Commercial Advantage Capabilities:
-- 1. Dual-Token Physical + EPR Credit Bundling (CPCB PWP Integration)
-- 2. Pre-Auction Quality Assay & Intake Verification Log (Zero As-Is Risk)
-- 3. Recycler Trade Credit & Invoice Ledger (14/30-Day Working Capital)
-- 4. Subscription Forward Supply Contracts (Bilateral Collar Hedging)
-- 5. Digital Form-6 Transport Manifests (Automated Regulatory Transit)
-- ============================================================================

-- 1. Dual-Token Physical + EPR Credit Bundling Table
CREATE TABLE IF NOT EXISTS epr_token_bundles (
    bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES scrap_listings(listing_id) ON DELETE CASCADE,
    recycler_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plastic_processor_id VARCHAR(100) NOT NULL, -- Official CPCB PWP Registration ID
    gst_transaction_id VARCHAR(100) NOT NULL,
    physical_weight_kg NUMERIC(10, 2) NOT NULL,
    material_category VARCHAR(50) NOT NULL, -- 'CAT_I_RIGID', 'CAT_II_FLEXIBLE', 'E_WASTE_PCB'
    cpcb_certificate_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 Hash
    issued_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_token_bundles_listing ON epr_token_bundles(listing_id);
CREATE INDEX IF NOT EXISTS idx_epr_token_bundles_recycler ON epr_token_bundles(recycler_id);
CREATE INDEX IF NOT EXISTS idx_epr_token_bundles_hash ON epr_token_bundles(cpcb_certificate_hash);

-- 2. Pre-Auction Quality Assay & Intake Verification Log
CREATE TABLE IF NOT EXISTS quality_intake_assays (
    assay_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES scrap_listings(listing_id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    declared_weight_kg NUMERIC(10, 2) NOT NULL,
    verified_weight_kg NUMERIC(10, 2) NOT NULL,
    measured_purity_pct NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
    moisture_deduction_kg NUMERIC(10, 2) DEFAULT 0.00,
    calculated_deduction_inr NUMERIC(10, 2) DEFAULT 0.00,
    final_payable_amount_inr NUMERIC(10, 2) NOT NULL,
    inspection_notes TEXT,
    verified_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_assays_listing ON quality_intake_assays(listing_id);
CREATE INDEX IF NOT EXISTS idx_quality_assays_inspector ON quality_intake_assays(inspector_id);

-- 3. Recycler Trade Credit & Invoice Ledger (14/30-Day Credit Terms)
CREATE TABLE IF NOT EXISTS recycler_trade_credits (
    credit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recycler_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES scrap_listings(listing_id) ON DELETE CASCADE,
    invoice_amount_inr NUMERIC(12, 2) NOT NULL,
    credit_period_days INT DEFAULT 14,
    due_date DATE NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'OVERDUE', 'DEFAULTED')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recycler_trade_credits_recycler ON recycler_trade_credits(recycler_id);
CREATE INDEX IF NOT EXISTS idx_recycler_trade_credits_listing ON recycler_trade_credits(listing_id);
CREATE INDEX IF NOT EXISTS idx_recycler_trade_credits_status ON recycler_trade_credits(payment_status);

-- 4. Subscription Forward Supply Contracts
CREATE TABLE IF NOT EXISTS recurring_feedstock_contracts (
    contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recycler_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    dwcc_hub_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    material_grade VARCHAR(50) NOT NULL,
    monthly_committed_tonnes NUMERIC(10, 2) NOT NULL,
    agreed_floor_price_per_kg NUMERIC(10, 2) NOT NULL,
    agreed_cap_price_per_kg NUMERIC(10, 2) NOT NULL,
    contract_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (contract_status IN ('ACTIVE', 'PAUSED', 'EXPIRED')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_contracts_recycler ON recurring_feedstock_contracts(recycler_id);
CREATE INDEX IF NOT EXISTS idx_recurring_contracts_hub ON recurring_feedstock_contracts(dwcc_hub_id);
CREATE INDEX IF NOT EXISTS idx_recurring_contracts_status ON recurring_feedstock_contracts(contract_status);

-- 5. Digital Form-6 Transport Manifests (SRO Synergy)
CREATE TABLE IF NOT EXISTS transport_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES scrap_listings(listing_id) ON DELETE CASCADE,
    carrier_vehicle_number VARCHAR(50) NOT NULL,
    driver_mobile VARCHAR(20) NOT NULL,
    origin_address TEXT NOT NULL,
    destination_facility TEXT NOT NULL,
    form6_manifest_hash VARCHAR(64) UNIQUE NOT NULL, -- Regulatory E-Waste/Hazardous Manifest
    dispatch_status VARCHAR(50) DEFAULT 'IN_TRANSIT' CHECK (dispatch_status IN ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_manifests_listing ON transport_manifests(listing_id);
CREATE INDEX IF NOT EXISTS idx_transport_manifests_hash ON transport_manifests(form6_manifest_hash);
