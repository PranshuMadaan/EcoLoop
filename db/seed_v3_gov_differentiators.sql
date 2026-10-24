-- ============================================================================
-- EcoLoop Build #3: Seed Data for Government Auction Competitive Differentiators
-- Seed records linking established DWCC Sellers, Recyclers, and Scrap Lots
-- ============================================================================

-- Clean existing data for idempotency
TRUNCATE TABLE 
    transport_manifests, 
    recurring_feedstock_contracts, 
    recycler_trade_credits, 
    quality_intake_assays, 
    epr_token_bundles 
CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Seed Dual-Token Physical + EPR Credit Bundles
-- ----------------------------------------------------------------------------
INSERT INTO epr_token_bundles (
    bundle_id, listing_id, recycler_id, plastic_processor_id, gst_transaction_id,
    physical_weight_kg, material_category, cpcb_certificate_hash, issued_at
) VALUES
(
    '99999999-9999-9999-9999-999999999901',
    '44444444-4444-4444-4444-444444444401', -- PET Lot 1 (Dwarka)
    '33333333-3333-3333-3333-333333333303', -- Ganesha Ecosphere Ltd
    'CPCB-PWP-2026-DL-00412',
    'GSTIN-07AABCG1234F1Z5-EWAY-982149102',
    12500.00,
    'CAT_I_RIGID',
    '4f8a1e2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    NOW() - INTERVAL '2 days'
),
(
    '99999999-9999-9999-9999-999999999902',
    '44444444-4444-4444-4444-444444444402', -- HDPE Lot 2 (Bengaluru)
    '33333333-3333-3333-3333-333333333302', -- Banyan Nation
    'CPCB-PWP-2026-KA-00189',
    'GSTIN-29AAACB9876E1Z9-EWAY-440192831',
    8200.00,
    'CAT_I_RIGID',
    'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
    NOW() - INTERVAL '1 day'
);

-- ----------------------------------------------------------------------------
-- 2. Seed Pre-Auction Quality Intake Assays
-- ----------------------------------------------------------------------------
INSERT INTO quality_intake_assays (
    assay_id, listing_id, inspector_id, declared_weight_kg, verified_weight_kg,
    measured_purity_pct, moisture_deduction_kg, calculated_deduction_inr,
    final_payable_amount_inr, inspection_notes, verified_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '44444444-4444-4444-4444-444444444401', -- PET Lot 1
    '22222222-2222-2222-2222-222222222201', -- MCD Inspector
    12500.00,
    12480.00,
    91.50,
    120.00,
    4200.00,
    432600.00,
    'DWCC calibrated digital weighbridge inspection. Moisture 2.8% within acceptable CPCB tolerance. Transparent baled bottles.',
    NOW() - INTERVAL '3 days'
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '44444444-4444-4444-4444-444444444402', -- HDPE Lot 2
    '22222222-2222-2222-2222-222222222202', -- BBMP Inspector
    8200.00,
    8190.00,
    88.00,
    80.00,
    1760.00,
    178420.00,
    'Baled rigid containers and drums. Clean segregation, zero hazardous chemical residue detected.',
    NOW() - INTERVAL '2 days'
);

-- ----------------------------------------------------------------------------
-- 3. Seed Recycler Trade Credit & Invoices (14/30-Day Working Capital)
-- ----------------------------------------------------------------------------
INSERT INTO recycler_trade_credits (
    credit_id, recycler_id, listing_id, invoice_amount_inr,
    credit_period_days, due_date, payment_status, created_at
) VALUES
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '33333333-3333-3333-3333-333333333303', -- Ganesha Ecosphere
    '44444444-4444-4444-4444-444444444401',
    432600.00,
    14,
    CURRENT_DATE + INTERVAL '12 days',
    'PENDING',
    NOW() - INTERVAL '2 days'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '33333333-3333-3333-3333-333333333302', -- Banyan Nation
    '44444444-4444-4444-4444-444444444402',
    178420.00,
    30,
    CURRENT_DATE + INTERVAL '26 days',
    'PENDING',
    NOW() - INTERVAL '4 days'
);

-- ----------------------------------------------------------------------------
-- 4. Seed Subscription Forward Supply Contracts
-- ----------------------------------------------------------------------------
INSERT INTO recurring_feedstock_contracts (
    contract_id, recycler_id, dwcc_hub_id, material_grade,
    monthly_committed_tonnes, agreed_floor_price_per_kg, agreed_cap_price_per_kg,
    contract_status, start_date, end_date
) VALUES
(
    'cccccccc-cccc-cccc-cccc-cccccccccc01',
    '33333333-3333-3333-3333-333333333303', -- Ganesha Ecosphere
    '22222222-2222-2222-2222-222222222201', -- MCD Dwarka MRF
    'PET_CLEAR',
    50.00, -- 50 MT/month
    32.00, -- ₹32/kg Floor
    42.00, -- ₹42/kg Cap
    'ACTIVE',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '165 days'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccc02',
    '33333333-3333-3333-3333-333333333302', -- Banyan Nation
    '22222222-2222-2222-2222-222222222202', -- BBMP Ward 150
    'HDPE_RIGID',
    35.00, -- 35 MT/month
    20.00, -- ₹20/kg Floor
    28.00, -- ₹28/kg Cap
    'ACTIVE',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '170 days'
);

-- ----------------------------------------------------------------------------
-- 5. Seed Digital Form-6 Transport Manifests
-- ----------------------------------------------------------------------------
INSERT INTO transport_manifests (
    manifest_id, listing_id, carrier_vehicle_number, driver_mobile,
    origin_address, destination_facility, form6_manifest_hash, dispatch_status, created_at
) VALUES
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    '44444444-4444-4444-4444-444444444401',
    'DL-1L-AA-4921',
    '+919811029384',
    'MCD MRF Facility, Dwarka Sector 14, New Delhi - 110078',
    'Ganesha Ecosphere rPET Plant, Bilaspur Industrial Area, Greater Noida - 201306',
    'd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
    'IN_TRANSIT',
    NOW() - INTERVAL '18 hours'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    '44444444-4444-4444-4444-444444444402',
    'KA-01-EV-8842',
    '+919845019283',
    'BBMP Ward 150 Aggregation Center, Bellandur, Bengaluru - 560103',
    'Banyan Nation Re-granulation Facility, KIADB Industrial Area, Bidadi - 562109',
    'e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
    'SCHEDULED',
    NOW() - INTERVAL '2 hours'
);
