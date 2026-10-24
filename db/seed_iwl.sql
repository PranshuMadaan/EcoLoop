-- ============================================================================
-- EcoLoop Module: Informal Worker Digital Ledger (IWL / IWF)
-- Seed Data: Worker Profiles, Daily Weigh-Ins & Instant Payout Transactions
-- ============================================================================

-- 1. Ensure pickers exist in users table
INSERT INTO users (user_id, role, mobile_number, password_hash, organization_name, cpcb_reg_number, upi_vpa, verification_status, created_at)
VALUES
    (
        '11111111-1111-1111-1111-111111111103',
        'Picker',
        '+919876543212',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'SWaCH Pune Seva Sahakari Sanstha Maryadit',
        'PMC/SWaCH/2021/PUN-084',
        'maruti.swach@sbi',
        'VERIFIED',
        NOW() - INTERVAL '45 days'
    ),
    (
        '11111111-1111-1111-1111-111111111104',
        'Picker',
        '+919876543213',
        '$2b$10$1tpGzrCoVXLw8z.dgUteYuDVNpbaqj3C0s2ZJHKXQFqYhuGqtqA7.',
        'Hasiru Dala Trust (Bengaluru Ward 150)',
        'BBMP/HD/2022/BLR-112',
        'lakshmi.waste@barodampay',
        'VERIFIED',
        NOW() - INTERVAL '35 days'
    )
ON CONFLICT (mobile_number) DO NOTHING;

-- Clear previous IWL seed data cleanly
TRUNCATE TABLE worker_payout_transactions, worker_weigh_ins, worker_profiles CASCADE;

-- 2. Worker Profiles
INSERT INTO worker_profiles (worker_id, user_id, full_name, preferred_language, municipal_id_number, cooperative_affiliation, kyc_status, qr_code_hash, created_at)
VALUES
    (
        '77777777-7777-7777-7777-777777777701',
        '11111111-1111-1111-1111-111111111101',
        'Ramesh Kumar',
        'kn',
        'BBMP-WP-2023-04812',
        'Hasiru Dala',
        'VERIFIED',
        'IWL-QR-777701-BLR-RAMESH-2026',
        NOW() - INTERVAL '30 days'
    ),
    (
        '77777777-7777-7777-7777-777777777702',
        '11111111-1111-1111-1111-111111111102',
        'Sunita Devi',
        'hi',
        'MCD-DEL-WP-2022-09144',
        'Chintan',
        'VERIFIED',
        'IWL-QR-777702-DEL-SUNITA-2026',
        NOW() - INTERVAL '25 days'
    ),
    (
        '77777777-7777-7777-7777-777777777703',
        '11111111-1111-1111-1111-111111111103',
        'Maruti Shinde',
        'mr',
        'PMC-SWaCH-WP-2021-03112',
        'SWaCH Pune',
        'VERIFIED',
        'IWL-QR-777703-PUN-MARUTI-2026',
        NOW() - INTERVAL '20 days'
    ),
    (
        '77777777-7777-7777-7777-777777777704',
        '11111111-1111-1111-1111-111111111104',
        'Lakshmi Bai',
        'kn',
        'BBMP-WP-2023-05991',
        'Hasiru Dala',
        'VERIFIED',
        'IWL-QR-777704-BLR-LAKSHMI-2026',
        NOW() - INTERVAL '15 days'
    );

-- 3. Daily Weigh-In Logs
INSERT INTO worker_weigh_ins (
    weigh_in_id,
    worker_id,
    dwcc_hub_id,
    material_grade,
    gross_weight_kg,
    tare_weight_kg,
    net_weight_kg,
    applied_rate_per_kg,
    total_payable_inr,
    payout_status,
    created_at
)
VALUES
    -- Weigh-in 1: Ramesh Kumar at BBMP Ward 150 Hub (HDPE, Paid)
    (
        '88888888-8888-8888-8888-888888888801',
        '77777777-7777-7777-7777-777777777701',
        '22222222-2222-2222-2222-222222222202',
        'HDPE',
        42.50,
        2.50,
        40.00,
        24.50,
        980.00,
        'PAID',
        NOW() - INTERVAL '3 days'
    ),
    -- Weigh-in 2: Ramesh Kumar at BBMP Ward 150 Hub (PET, Paid)
    (
        '88888888-8888-8888-8888-888888888802',
        '77777777-7777-7777-7777-777777777701',
        '22222222-2222-2222-2222-222222222202',
        'PET',
        56.80,
        1.80,
        55.00,
        18.00,
        990.00,
        'PAID',
        NOW() - INTERVAL '2 days'
    ),
    -- Weigh-in 3: Sunita Devi at MCD MRF Dwarka (Paper, Paid)
    (
        '88888888-8888-8888-8888-888888888803',
        '77777777-7777-7777-7777-777777777702',
        '22222222-2222-2222-2222-222222222201',
        'Paper',
        88.00,
        3.00,
        85.00,
        12.00,
        1020.00,
        'PAID',
        NOW() - INTERVAL '2 days'
    ),
    -- Weigh-in 4: Maruti Shinde at BBMP Hub (PP, Paid)
    (
        '88888888-8888-8888-8888-888888888804',
        '77777777-7777-7777-7777-777777777703',
        '22222222-2222-2222-2222-222222222202',
        'PP',
        31.20,
        1.20,
        30.00,
        22.00,
        660.00,
        'PAID',
        NOW() - INTERVAL '1 day'
    ),
    -- Weigh-in 5: Lakshmi Bai at BBMP Ward 150 Hub (LDPE, Pending)
    (
        '88888888-8888-8888-8888-888888888805',
        '77777777-7777-7777-7777-777777777704',
        '22222222-2222-2222-2222-222222222202',
        'LDPE',
        26.50,
        1.50,
        25.00,
        16.00,
        400.00,
        'PENDING',
        NOW() - INTERVAL '4 hours'
    );

-- 4. Instant Payout Receipts
INSERT INTO worker_payout_transactions (
    payout_id,
    weigh_in_id,
    worker_id,
    amount_inr,
    seller_upi_vpa,
    razorpay_payout_id,
    utr_number,
    transaction_status,
    processed_at
)
VALUES
    (
        '99999999-9999-9999-9999-999999999901',
        '88888888-8888-8888-8888-888888888801',
        '77777777-7777-7777-7777-777777777701',
        980.00,
        'ramesh.waste@upi',
        'pout_IWL_839201948191',
        '629849102941',
        'PROCESSED',
        NOW() - INTERVAL '3 days' + INTERVAL '30 seconds'
    ),
    (
        '99999999-9999-9999-9999-999999999902',
        '88888888-8888-8888-8888-888888888802',
        '77777777-7777-7777-7777-777777777701',
        990.00,
        'ramesh.waste@upi',
        'pout_IWL_839201948192',
        '629849102942',
        'PROCESSED',
        NOW() - INTERVAL '2 days' + INTERVAL '45 seconds'
    ),
    (
        '99999999-9999-9999-9999-999999999903',
        '88888888-8888-8888-8888-888888888803',
        '77777777-7777-7777-7777-777777777702',
        1020.00,
        'sunita.devi@okhdfcbank',
        'pout_IWL_839201948193',
        '629849102943',
        'PROCESSED',
        NOW() - INTERVAL '2 days' + INTERVAL '20 seconds'
    ),
    (
        '99999999-9999-9999-9999-999999999904',
        '88888888-8888-8888-8888-888888888804',
        '77777777-7777-7777-7777-777777777703',
        660.00,
        'maruti.swach@sbi',
        'pout_IWL_839201948194',
        '629849102944',
        'PROCESSED',
        NOW() - INTERVAL '1 day' + INTERVAL '15 seconds'
    );
