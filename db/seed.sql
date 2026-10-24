-- ============================================================================
-- EcoLoop Build #1: B2B Digital Scrap Marketplace
-- Seed Data Script (Phase 1 + Phase 2)
-- Default Seed User Password for all mock accounts: Password@123
-- ============================================================================

-- Clear existing data (in reverse dependency order) for clean idempotent seeding
TRUNCATE TABLE epr_tokens, bids, scrap_listings, users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Seed Users
-- 2 Pickers, 1 DWCC, 2 Recyclers
-- ----------------------------------------------------------------------------
INSERT INTO users (user_id, role, mobile_number, password_hash, upi_vpa, verification_status, created_at)
VALUES
    -- Picker 1: Ramesh Kumar (Informal waste collector)
    (
        '11111111-1111-1111-1111-111111111101',
        'Picker',
        '+919876543210',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'ramesh.waste@upi',
        'VERIFIED',
        NOW() - INTERVAL '10 days'
    ),
    -- Picker 2: Sunita Devi (Door-to-door aggregator)
    (
        '11111111-1111-1111-1111-111111111102',
        'Picker',
        '+919876543211',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'sunita.devi@okhdfcbank',
        'VERIFIED',
        NOW() - INTERVAL '8 days'
    ),
    -- DWCC: Ward 150 Dry Waste Collection Centre (Semi-formal hub)
    (
        '22222222-2222-2222-2222-222222222201',
        'DWCC',
        '+919876543220',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'dwcc.ward150@sbi',
        'VERIFIED',
        NOW() - INTERVAL '15 days'
    ),
    -- Recycler 1: EcoGreen Polymers Pvt Ltd (Plastic re-granulator)
    (
        '33333333-3333-3333-3333-333333333301',
        'Recycler',
        '+919876543230',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'finance@ecogreenpoly.icici',
        'VERIFIED',
        NOW() - INTERVAL '20 days'
    ),
    -- Recycler 2: CleanEarth E-Recyclers (Authorized E-waste & metal smelter)
    (
        '33333333-3333-3333-3333-333333333302',
        'Recycler',
        '+919876543231',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'payments@cleanearth.axis',
        'VERIFIED',
        NOW() - INTERVAL '18 days'
    );

-- ----------------------------------------------------------------------------
-- 2. Seed Scrap Listings
-- 4 sample listings: PET, HDPE, E-Waste, Paper
-- ----------------------------------------------------------------------------
INSERT INTO scrap_listings (listing_id, seller_id, material_grade, weight_kg, min_price, status, created_at)
VALUES
    -- Listing 1: Baled PET Bottles from DWCC Ward 150
    (
        '44444444-4444-4444-4444-444444444401',
        '22222222-2222-2222-2222-222222222201',
        'PET',
        1250.00,
        37500.00, -- ₹30/kg reserve
        'OPEN',
        NOW() - INTERVAL '2 days'
    ),
    -- Listing 2: Segregated HDPE Drums & Crates from DWCC Ward 150
    (
        '44444444-4444-4444-4444-444444444402',
        '22222222-2222-2222-2222-222222222201',
        'HDPE',
        820.50,
        36922.50, -- ₹45/kg reserve
        'BIDDING',
        NOW() - INTERVAL '1 day'
    ),
    -- Listing 3: Assorted E-Waste from Ramesh (Picker)
    (
        '44444444-4444-4444-4444-444444444403',
        '11111111-1111-1111-1111-111111111101',
        'E-Waste',
        175.00,
        26250.00, -- ₹150/kg reserve
        'OPEN',
        NOW() - INTERVAL '12 hours'
    ),
    -- Listing 4: Sorted Corrugated Cardboard from Sunita (Picker)
    (
        '44444444-4444-4444-4444-444444444404',
        '11111111-1111-1111-1111-111111111102',
        'Paper',
        640.00,
        7680.00, -- ₹12/kg reserve
        'SOLD',
        NOW() - INTERVAL '6 hours'
    );

-- ----------------------------------------------------------------------------
-- 3. Seed Bids
-- ----------------------------------------------------------------------------
INSERT INTO bids (bid_id, listing_id, bidder_id, bid_amount, bid_status, created_at)
VALUES
    (
        '55555555-5555-5555-5555-555555555501',
        '44444444-4444-4444-4444-444444444402',
        '33333333-3333-3333-3333-333333333301',
        38000.00,
        'ACTIVE',
        NOW() - INTERVAL '18 hours'
    ),
    (
        '55555555-5555-5555-5555-555555555502',
        '44444444-4444-4444-4444-444444444402',
        '33333333-3333-3333-3333-333333333302',
        40000.00,
        'ACTIVE',
        NOW() - INTERVAL '6 hours'
    ),
    (
        '55555555-5555-5555-5555-555555555503',
        '44444444-4444-4444-4444-444444444404',
        '33333333-3333-3333-3333-333333333301',
        8000.00,
        'ACCEPTED',
        NOW() - INTERVAL '5 hours'
    );

-- ----------------------------------------------------------------------------
-- 4. Seed EPR Tokens (For Completed Listing #4)
-- ----------------------------------------------------------------------------
INSERT INTO epr_tokens (token_id, listing_id, recycler_id, material_grade, verified_weight_mt, cpcb_certificate_hash, created_at)
VALUES
    (
        '66666666-6666-6666-6666-666666666601',
        '44444444-4444-4444-4444-444444444404',
        '33333333-3333-3333-3333-333333333301',
        'Paper',
        0.640, -- 640kg = 0.640 Metric Tonnes
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '4 hours'
    );
