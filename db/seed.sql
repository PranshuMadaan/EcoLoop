-- ============================================================================
-- EcoLoop Build #1: B2B Digital Scrap Marketplace
-- Official India MSTC E-Auction Lots & CPCB Registered Recyclers Seed Script
-- Default Seed User Password for all accounts: Password@123
-- ============================================================================

-- Clear existing data (in reverse dependency order) for clean idempotent seeding
TRUNCATE TABLE deposits, epr_tokens, bids, scrap_listings, payouts, ivr_sessions, direct_sales,
           picker_profiles, municipal_centers, material_rates, users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Seed Users: Indian Municipalities (ULBs/DWCCs), Pickers & CPCB Recyclers
-- ----------------------------------------------------------------------------
INSERT INTO users (user_id, role, mobile_number, password_hash, organization_name, cpcb_reg_number, upi_vpa, verification_status, created_at)
VALUES
    -- Seller 1 (DWCC): Municipal Corporation of Delhi (MCD - MRF Dwarka Sector 14)
    (
        '22222222-2222-2222-2222-222222222201',
        'DWCC',
        '+919876543220',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Municipal Corporation of Delhi (MCD MRF Dwarka)',
        'DPCC/WMC/2023/MRF-DEL-041',
        'mcd.dwarka.mrf@sbi',
        'VERIFIED',
        NOW() - INTERVAL '30 days'
    ),
    -- Seller 2 (DWCC): Bruhat Bengaluru Mahanagara Palike (BBMP Ward 150 Hub)
    (
        '22222222-2222-2222-2222-222222222202',
        'DWCC',
        '+919876543221',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Bruhat Bengaluru Mahanagara Palike (BBMP Ward 150)',
        'KSPCB/SWM/2022/BBMP-BLR-150',
        'bbmp.ward150.swm@canarabank',
        'VERIFIED',
        NOW() - INTERVAL '25 days'
    ),
    -- Seller 3 (DWCC): Western Railway Central Stores & Scrap Depot (Mumbai Mahalaxmi)
    (
        '22222222-2222-2222-2222-222222222203',
        'DWCC',
        '+919876543222',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Western Railway Scrap Disposal Depot (Mahalaxmi, Mumbai)',
        'MPCB/E-WASTE/WR-MUM-2021',
        'western.railway.scrap@sbi',
        'VERIFIED',
        NOW() - INTERVAL '20 days'
    ),
    -- Seller 4 (DWCC): Indian Oil Corporation Limited (IOCL Panipat Petrochemical)
    (
        '22222222-2222-2222-2222-222222222204',
        'DWCC',
        '+919876543223',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Indian Oil Corporation Limited (IOCL Panipat Complex)',
        'HSPCB/POLY/2020/IOCL-PAN-01',
        'iocl.panipat.disposal@sbi',
        'VERIFIED',
        NOW() - INTERVAL '15 days'
    ),
    -- Picker 1: Ramesh Kumar (Informal Waste Collector SHG)
    (
        '11111111-1111-1111-1111-111111111101',
        'Picker',
        '+919876543210',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Hasiru Dala Waste Pickers Self-Help Group (Bengaluru)',
        'CPCB/SHG/2023/HD-091',
        'ramesh.waste@upi',
        'VERIFIED',
        NOW() - INTERVAL '10 days'
    ),
    -- Picker 2: Sunita Devi (Aggregator)
    (
        '11111111-1111-1111-1111-111111111102',
        'Picker',
        '+919876543211',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Chintan Delhi Waste Aggregation Collective',
        'CPCB/SHG/2023/DEL-014',
        'sunita.devi@okhdfcbank',
        'VERIFIED',
        NOW() - INTERVAL '8 days'
    ),
    -- Recycler 1: Attero Recycling Pvt Ltd (CPCB Authorized E-Waste Smelter)
    (
        '33333333-3333-3333-3333-333333333301',
        'Recycler',
        '+919876543230',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Attero Recycling Pvt Ltd (CPCB Authorized E-Waste Smelter)',
        'CPCB/EPR/2022/E-WASTE/00481',
        'finance@attero.icici',
        'VERIFIED',
        NOW() - INTERVAL '40 days'
    ),
    -- Recycler 2: Banyan Nation (CPCB Registered Circular Polymer Re-granulator)
    (
        '33333333-3333-3333-3333-333333333302',
        'Recycler',
        '+919876543231',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Banyan Nation (CPCB Regd Circular Polymers Re-granulator)',
        'CPCB/PLASTIC/2021/REC-00129',
        'treasury@banyannation.axis',
        'VERIFIED',
        NOW() - INTERVAL '35 days'
    ),
    -- Recycler 3: Ganesha Ecosphere Ltd (India Largest rPET Fiber Producer)
    (
        '33333333-3333-3333-3333-333333333303',
        'Recycler',
        '+919876543232',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Ganesha Ecosphere Ltd (India Premier rPET Recycler)',
        'CPCB/EPR/2023/PET-00912',
        'commercial@ganeshaecosphere.hdfc',
        'VERIFIED',
        NOW() - INTERVAL '30 days'
    ),
    -- ULB Admin: Municipal SWM Command Cell (audit & reversal authority)
    (
        '22222222-2222-2222-2222-222222222210',
        'ULB',
        '+919876543240',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Municipal SWM Command Cell (ULB Payout Audit Authority)',
        NULL,
        'ulb.swm.command@mcd',
        'VERIFIED',
        NOW() - INTERVAL '45 days'
    ),
    -- Tier 2 Offline Picker 1: Bhagwan Das (no phone — synthetic OFF- identifier,
    -- identified at municipal counters via physical QR card code)
    (
        '11111111-1111-1111-1111-111111111103',
        'Picker',
        'OFF-70000000101',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Safai Sena Dabri Route Collective',
        'CPCB/SHG/2023/DEL-042',
        NULL,
        'VERIFIED',
        NOW() - INTERVAL '5 days'
    ),
    -- Tier 2 Offline Picker 2: Phoolwati Devi (no phone — paid via shared family UPI)
    (
        '11111111-1111-1111-1111-111111111104',
        'Picker',
        'OFF-70000000102',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Safai Sena Dabri Route Collective',
        'CPCB/SHG/2023/DEL-043',
        'phoolwati.family@ybl',
        'VERIFIED',
        NOW() - INTERVAL '4 days'
    );

-- ----------------------------------------------------------------------------
-- 2. Seed Scrap Listings (Conforming to Official MSTC E-Auction Lot Specifications)
-- ----------------------------------------------------------------------------
INSERT INTO scrap_listings (listing_id, seller_id, material_grade, weight_kg, min_price, status, mstc_lot_no, origin_location, created_at)
VALUES
    -- Lot 1: Baled PET Bottles from MCD MRF Dwarka (MSTC E-Auction Catalog)
    (
        '44444444-4444-4444-4444-444444444401',
        '22222222-2222-2222-2222-222222222201',
        'PET',
        12500.00,
        437500.00, -- ₹35/kg reserve (12.5 MT)
        'OPEN',
        'MSTC/ND/MCD/24-25/ET/1042',
        'Delhi NCR (MCD MRF Facility, Dwarka Sector 14)',
        NOW() - INTERVAL '3 days'
    ),
    -- Lot 2: Segregated Rigid HDPE Drums & Crates from BBMP Ward 150 Hub
    (
        '44444444-4444-4444-4444-444444444402',
        '22222222-2222-2222-2222-222222222202',
        'HDPE',
        8400.00,
        394800.00, -- ₹47/kg reserve (8.4 MT)
        'BIDDING',
        'MSTC/BLR/BBMP/24-25/ET/0891',
        'Bengaluru, Karnataka (BBMP Ward 150 Aggregation Hub)',
        NOW() - INTERVAL '2 days'
    ),
    -- Lot 3: Decommissioned Electronic & Telecom Hardware from Western Railway
    (
        '44444444-4444-4444-4444-444444444403',
        '22222222-2222-2222-2222-222222222203',
        'E-Waste',
        3200.00,
        512000.00, -- ₹160/kg reserve (3.2 MT)
        'OPEN',
        'MSTC/WRO/RLY/24-25/ET/2119',
        'Mumbai, Maharashtra (Western Railway Depot, Mahalaxmi)',
        NOW() - INTERVAL '1 day'
    ),
    -- Lot 4: Sorted Corrugated Cardboard (OCC) from MCD Okhla MRF
    (
        '44444444-4444-4444-4444-444444444404',
        '22222222-2222-2222-2222-222222222201',
        'Paper',
        9500.00,
        142500.00, -- ₹15/kg reserve (9.5 MT)
        'SOLD',
        'MSTC/ND/MCD/24-25/ET/1105',
        'Delhi NCR (South Delhi MCD Okhla MRF)',
        NOW() - INTERVAL '18 hours'
    ),
    -- Lot 5: Industrial Polypropylene (PP) Drums from IOCL Panipat
    (
        '44444444-4444-4444-4444-444444444405',
        '22222222-2222-2222-2222-222222222204',
        'PP',
        15000.00,
        780000.00, -- ₹52/kg reserve (15.0 MT)
        'OPEN',
        'MSTC/NRO/IOCL/24-25/ET/0445',
        'Panipat, Haryana (IOCL Petrochemical Complex)',
        NOW() - INTERVAL '12 hours'
    ),
    -- Lot 6: Heavy Ferrous & Structural Metal Scrap from Western Railway
    (
        '44444444-4444-4444-4444-444444444406',
        '22222222-2222-2222-2222-222222222203',
        'Metal',
        18500.00,
        647500.00, -- ₹35/kg reserve (18.5 MT)
        'OPEN',
        'MSTC/WRO/RLY/24-25/ET/2280',
        'Mumbai, Maharashtra (Lower Parel Railway Workshop)',
        NOW() - INTERVAL '6 hours'
    );

-- ----------------------------------------------------------------------------
-- 3. Seed Bids (Active Competitive Bids on Official Lots)
-- ----------------------------------------------------------------------------
INSERT INTO bids (bid_id, listing_id, bidder_id, bid_amount, bid_status, created_at)
VALUES
    -- Bids on Lot 2 (HDPE - BBMP Bengaluru)
    (
        '55555555-5555-5555-5555-555555555501',
        '44444444-4444-4444-4444-444444444402',
        '33333333-3333-3333-3333-333333333302',
        405000.00,
        'ACTIVE',
        NOW() - INTERVAL '24 hours'
    ),
    (
        '55555555-5555-5555-5555-555555555502',
        '44444444-4444-4444-4444-444444444402',
        '33333333-3333-3333-3333-333333333301',
        420000.00,
        'ACTIVE',
        NOW() - INTERVAL '10 hours'
    ),
    -- Winning Bid on Lot 4 (Paper - MCD Delhi)
    (
        '55555555-5555-5555-5555-555555555503',
        '44444444-4444-4444-4444-444444444404',
        '33333333-3333-3333-3333-333333333301',
        150000.00,
        'ACCEPTED',
        NOW() - INTERVAL '15 hours'
    );

-- ----------------------------------------------------------------------------
-- 4. Seed Escrow Deposit (Attero funded escrow before Lot #4 settlement)
-- ----------------------------------------------------------------------------
INSERT INTO deposits (listing_id, bidder_id, reference_no, amount_inr, channel, status, gateway_transaction_id, confirmed_at, created_at)
VALUES
    (
        '44444444-4444-4444-4444-444444444404',
        '33333333-3333-3333-3333-333333333301',
        'ECOP4444444444444444444444444040AA01',
        150000.00,
        'UPI',
        'SUCCESS',
        'DEP-SEED-LOT4-0001',
        NOW() - INTERVAL '16 hours',
        NOW() - INTERVAL '17 hours'
    );

-- ----------------------------------------------------------------------------
-- 5. Seed Payouts Ledger Row (Real-time Escrow Liquidation for Settled Lot #4)
--    Split: gross ₹1,50,000 = ₹1,47,750 seller net + ₹1,500 platform + ₹750 welfare
-- ----------------------------------------------------------------------------
INSERT INTO payouts (listing_id, seller_id, payee_vpa, gross_amount, seller_net_amount, platform_fee, welfare_levy, gateway_transaction_id, bank_rrn, status, created_at)
VALUES
    (
        '44444444-4444-4444-4444-444444444404',
        '22222222-2222-2222-2222-222222222201',
        'mcd.dwarka.mrf@sbi',
        150000.00,
        147750.00,
        1500.00,
        750.00,
        'UPI-TXN-SEED-LOT4-0001',
        'RRN150000123456',
        'SUCCESS',
        NOW() - INTERVAL '14 hours'
    );

-- ----------------------------------------------------------------------------
-- 6. Seed EPR Tokens (CPCB Ledger Hash for Settled Lot #4)
--    NOTE: this seed hash is a static placeholder (sha256 of empty string). The
--    verify endpoint recomputes the certificate hash from listing data, so this
--    seeded token will report hash_mismatch: true — useful as a tamper-detection demo.
--    Tokens minted through accept-bid carry real recomputable hashes.
-- ----------------------------------------------------------------------------
INSERT INTO epr_tokens (token_id, listing_id, recycler_id, material_grade, verified_weight_mt, cpcb_certificate_hash, created_at)
VALUES
    (
        '66666666-6666-6666-6666-666666666601',
        '44444444-4444-4444-4444-444444444404',
        '33333333-3333-3333-3333-333333333301',
        'Paper',
        9.500, -- 9,500 kg = 9.500 Metric Tonnes
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        NOW() - INTERVAL '14 hours'
    );

-- ----------------------------------------------------------------------------
-- 5. Seed Picker Profiles (2-Tier intake registry)
-- ----------------------------------------------------------------------------
INSERT INTO picker_profiles (profile_id, user_id, tier, language_pref, card_code, display_name, home_ward, route_notes, registered_by, registered_at)
VALUES
    -- Tier 1: Ramesh calls the IVR line from his phone (prefers Hindi voice menus)
    (
        '88888888-8888-8888-8888-888888888801',
        '11111111-1111-1111-1111-111111111101',
        'IVR',
        'hi',
        NULL,
        'Ramesh Kumar',
        'Ward 150 (Bengaluru)',
        NULL,
        '22222222-2222-2222-2222-222222222202',
        NOW() - INTERVAL '9 days'
    ),
    -- Tier 1: Sunita calls the IVR line from her phone (English voice menus)
    (
        '88888888-8888-8888-8888-888888888802',
        '11111111-1111-1111-1111-111111111102',
        'IVR',
        'en',
        NULL,
        'Sunita Devi',
        'Ward 134 (Delhi)',
        NULL,
        '22222222-2222-2222-2222-222222222201',
        NOW() - INTERVAL '7 days'
    ),
    -- Tier 2: Bhagwan Das has no phone — scans/reads his physical card at the counter,
    -- keeps his normal Dabri route, now sells direct to the MCD center
    (
        '88888888-8888-8888-8888-888888888803',
        '11111111-1111-1111-1111-111111111103',
        'OFFLINE',
        'hi',
        'ECO-4F2A91',
        'Bhagwan Das',
        'Ward 134 (Dabri, Delhi)',
        'Dabri mor → Dwarka Sector 6 market line → MCD MRF counter (morning shift)',
        '22222222-2222-2222-2222-222222222201',
        NOW() - INTERVAL '5 days'
    ),
    -- Tier 2: Phoolwati Devi has no phone — paid to a shared family UPI VPA
    (
        '88888888-8888-8888-8888-888888888804',
        '11111111-1111-1111-1111-111111111104',
        'OFFLINE',
        'hi',
        'ECO-9D5B22',
        'Phoolwati Devi',
        'Ward 134 (Dabri, Delhi)',
        'Dwarka Sector 10 pockets → MCD MRF counter (afternoon shift)',
        '22222222-2222-2222-2222-222222222201',
        NOW() - INTERVAL '4 days'
    );

-- ----------------------------------------------------------------------------
-- 6. Seed Official Material Rate Card (transparent rates vs middlemen quotes)
-- ----------------------------------------------------------------------------
INSERT INTO material_rates (rate_id, material_grade, rate_per_kg, middleman_rate_per_kg, effective_from)
VALUES
    ('99999999-9999-9999-9999-999999999901', 'PET',        28.00, 18.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999902', 'HDPE',       32.00, 22.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999903', 'LDPE',       20.00, 12.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999904', 'PP',         30.00, 20.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999905', 'E-Waste',    65.00, 40.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999906', 'Paper',      14.00,  9.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999907', 'Cardboard',  10.00,  6.00, NOW() - INTERVAL '2 days'),
    ('99999999-9999-9999-9999-999999999908', 'Metal',      45.00, 32.00, NOW() - INTERVAL '2 days');

-- ----------------------------------------------------------------------------
-- 7. Seed Municipal Collection Centers (Tier 2 direct-sale counters)
-- ----------------------------------------------------------------------------
INSERT INTO municipal_centers (center_id, center_name, ward, address, latitude, longitude, managed_by, is_active, created_at)
VALUES
    (
        '77777777-7777-7777-7777-777777777701',
        'MCD Material Recovery Facility — Direct Sale Counter',
        'Ward 39 (Dwarka, Delhi)',
        'MCD MRF, Sector 14 Dwarka, New Delhi 110078',
        28.5921000,
        77.0460000,
        '22222222-2222-2222-2222-222222222201',
        TRUE,
        NOW() - INTERVAL '6 days'
    ),
    (
        '77777777-7777-7777-7777-777777777702',
        'BBMP Dry Waste Collection Center — Direct Sale Counter',
        'Ward 150 (Bengaluru)',
        'BBMP DWCC, Ward 150, Bengaluru 560068',
        12.9352000,
        77.6245000,
        '22222222-2222-2222-2222-222222222202',
        TRUE,
        NOW() - INTERVAL '6 days'
    );

-- ----------------------------------------------------------------------------
-- 8. Seed Direct Sales Ledger (Tier 2 walk-in sales replacing middlemen sales)
-- ----------------------------------------------------------------------------
INSERT INTO direct_sales (sale_id, center_id, picker_user_id, material_grade, weight_kg, rate_per_kg, middleman_rate_per_kg, gross_amount, middleman_uplift, payment_mode, payment_status, gateway_transaction_id, recorded_by, created_at)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa01',
        '77777777-7777-7777-7777-777777777701',
        '11111111-1111-1111-1111-111111111103',
        'PET', 12.50, 28.00, 18.00,
        350.00,  -- 12.5 kg x ₹28 official rate
        125.00,  -- middleman would have paid only ₹225 → ₹125 extra earned
        'CASH',
        'CASH_DISPENSED',
        NULL,
        '22222222-2222-2222-2222-222222222201',
        NOW() - INTERVAL '1 day'
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa02',
        '77777777-7777-7777-7777-777777777701',
        '11111111-1111-1111-1111-111111111104',
        'HDPE', 8.00, 32.00, 22.00,
        256.00,  -- 8 kg x ₹32 official rate
        80.00,   -- middleman would have paid only ₹176 → ₹80 extra earned
        'UPI',
        'SUCCESS',
        'UPI-TXN-SEED-8F2K-DIRECT-SALE',
        '22222222-2222-2222-2222-222222222201',
        NOW() - INTERVAL '6 hours'
    );
