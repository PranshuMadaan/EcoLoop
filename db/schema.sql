-- ============================================================================
-- EcoLoop Build #1: B2B Digital Scrap Marketplace
-- Database Schema Definition (Phase 1 + Phase 2)
-- ============================================================================

-- Enable UUID extension (gen_random_uuid is standard in PG 13+, uuid-ossp as fallback)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension for spatial queries (geo-fencing, collection centers, routes)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION
    WHEN undefined_file THEN
        RAISE NOTICE 'PostGIS extension not available in this PostgreSQL installation. Skipping...';
END
$$;

-- ----------------------------------------------------------------------------
-- 1. Users Table
-- Roles: Picker, DWCC, Recycler, ULB
-- Includes password_hash for bcrypt-based secure authentication
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Picker', 'DWCC', 'Recycler', 'ULB')),
    upi_vpa VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'PENDING' 
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent column addition if users table pre-existed
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Indexes for fast user lookups by role and mobile number
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users(mobile_number);

-- ----------------------------------------------------------------------------
-- 2. Scrap Listings Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrap_listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    material_grade VARCHAR(50) NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg > 0),
    min_price NUMERIC(10, 2) NOT NULL CHECK (min_price >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'BIDDING', 'SOLD', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrap_listings_seller_id ON scrap_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_scrap_listings_material_grade ON scrap_listings(material_grade);
CREATE INDEX IF NOT EXISTS idx_scrap_listings_status ON scrap_listings(status);
CREATE INDEX IF NOT EXISTS idx_scrap_listings_created_at ON scrap_listings(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Bids Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
    bid_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES scrap_listings(listing_id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bid_amount NUMERIC(10, 2) NOT NULL CHECK (bid_amount > 0),
    bid_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (bid_status IN ('ACTIVE', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_listing_id ON bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. EPR Tokens Table (Compliance & Traceability for Recyclers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS epr_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES scrap_listings(listing_id) ON DELETE CASCADE,
    recycler_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    material_grade VARCHAR(50) NOT NULL,
    verified_weight_mt NUMERIC(10, 3) NOT NULL CHECK (verified_weight_mt > 0),
    cpcb_certificate_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epr_tokens_listing_id ON epr_tokens(listing_id);
CREATE INDEX IF NOT EXISTS idx_epr_tokens_recycler_id ON epr_tokens(recycler_id);
CREATE INDEX IF NOT EXISTS idx_epr_tokens_cpcb_hash ON epr_tokens(cpcb_certificate_hash);
