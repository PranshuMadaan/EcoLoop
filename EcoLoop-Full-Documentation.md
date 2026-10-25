# EcoLoop — Complete Technical Documentation

> **Repository:** `/Users/aayushgarg/EcoLoop` · Main branch: `main` (in sync with `origin/main`)
> **Project:** B2B digital scrap marketplace + informal waste-picker intake platform
> **Origin:** TIET Japan Hackathon (Mitsui & Co. problem statement) — **Team EcoMirai**: Aayush Garg (leader/backend architect), Divyanshu Batta (mobile/PWA), Pranshu Madaan (frontend/UI-UX), Mrigank Choudhary (data/cloud)
> **Generated:** 25 October 2026

---

## Table of Contents

1. [What EcoLoop Is](#1-what-ecoloop-is)
2. [Repository Layout](#2-repository-layout)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Backend — Express API (`src/`)](#5-backend--express-api-src)
6. [Database — Schema & Seed (`db/`)](#6-database--schema--seed-db)
7. [The Two-Tier Picker Intake System](#7-the-two-tier-picker-intake-system)
8. [The Ledger / Escrow System](#8-the-ledger--escrow-system)
9. [EPR / CPCB Compliance Tokens](#9-epr--cpcb-compliance-tokens)
10. [Route Optimization Subsystem](#10-route-optimization-subsystem)
11. [Frontends](#11-frontends)
12. [Design System](#12-design-system)
13. [API Surface — Complete Reference](#13-api-surface--complete-reference)
14. [Deployment & Configuration](#14-deployment--configuration)
15. [Testing Strategy](#15-testing-strategy)
16. [Bug Log (BUG-001 … BUG-005)](#16-bug-log-bug-001--bug-005)
17. [Git History & Branch Status](#17-git-history--branch-status)
18. [Known Caveats & Security Notes](#18-known-caveats--security-notes)

---

## 1. What EcoLoop Is

EcoLoop is a **circular-economy platform for municipal solid waste in India**. It connects four actors — informal waste pickers, households, municipal bodies (ULBs / DWCCs), and CPCB-registered recyclers — through four stacked modules:

| # | Module | Purpose |
|---|--------|---------|
| 0 | **Two-Tier Picker Intake System** | Bring waste pickers into the digital economy: Tier 1 = bilingual voice IVR for pickers *with* a basic phone; Tier 2 = municipal direct-sale counters with physical QR cards for pickers *without* any phone. |
| 1 | **Spatial Route Optimizer** | C++ vehicle-routing (CVRP) engine for municipal collection fleets, with a React/Leaflet UI. |
| 2 | **Informal Worker Digital Ledger** | Escrow deposits, instant simulated UPI payouts, payout reversal, and an audit ledger. |
| 3 | **B2B Digital Scrap Marketplace** | Scrap lot listings → competitive bidding → escrow-gated settlement → CPCB EPR certificate tokens (SHA-256 hashed). |

**The core thesis:** eliminate the middleman from the informal waste chain. Every sale records a *middleman counterfactual* (what the middleman would have paid), so the picker's income uplift is measurable per transaction — "rectification, not charity." Claimed impact: 2.3× worker income (₹280→₹650+/day), 27% fleet distance reduction, up to 65% landfill diversion.

---

## 2. Repository Layout

```
EcoLoop/
├── server.js                 # Local dev server (long-running, port 5000, graceful shutdown)
├── api/index.js              # Vercel serverless entrypoint (re-exports src/app.js)
├── src/                      # Express API (the real backend)
│   ├── app.js                # App factory: CORS, cookies, routes, health, SPA fallback
│   ├── config/db.js          # pg Pool + SSL auto-detect (Neon), pingDatabase()
│   ├── middleware/           # auth.js (JWT + roles), errorHandler.js (PG code mapping)
│   ├── controllers/          # auth, user, listing, bid, auction, deposit, payout,
│   │                         #   epr, ivr, municipal  (10 controllers)
│   ├── routes/               # 8 route files under /api/v1/*
│   └── services/             # twiml.js (TwiML builder), ivrPrompts.js (bilingual prompts)
├── db/
│   ├── schema.sql            # 11 tables + indexes (279 lines)
│   ├── seed.sql              # Full demo dataset, MSTC-style lots, fixed UUIDs (459 lines)
│   ├── initDb.js / seedDb.js # One-shot runners for the SQL files
│   └── bug_log.md            # BUG-001…BUG-005 with 6-step debugging methodology
├── test/                     # 6 Node built-in-runner suites (+ tests/bugs duplicate)
├── frontend/                 # Vite vanilla-JS SPA → the production B2B marketplace UI
├── ecoloop-app/              # React 19 + Vite + Leaflet → route-optimizer client
├── ecoloop-backend/          # Separate Express 5 (CommonJS) "API Bridge" → spawns C++ engine
├── index.html                # Municipal Command Center landing (splash, ticker, marketing)
├── login.html                # Citizen/municipal auth portal + Neon Postgres DBMS console
├── user.html                 # Citizen dashboard: map tracking, credits, vouchers, AI bot
├── marketplace.html          # Simulated B2B auction floor (mock)
├── route-optimizer.html      # Simulated canvas ward map (mock)
├── waste-segregation.html    # AI photo waste-classifier client (real configurable API)
├── worker-ledger.html        # Mock mobile worker app (QR audits, BLE scale, UPI)
├── ecoloop-municipal.html    # 3-view municipal portal (hash-router SPA, mock)
├── UI-UX/                    # Prototype pages: Municipalities, Direct Sales, IVR Simulator, Dashboard pitch
├── docs/                     # two_tier_picker_system.md, upi_onboarding_and_payout_architecture.md
├── DESIGN_SYSTEM.md          # 688-line "Cyber-Industrial Circular Economy" spec
├── vercel.json               # Serverless rewrites (API + SPA)
├── docker-compose.yml        # postgis/postgis:16-3.4 with auto schema+seed
└── route-engine → optimise routes/   # Symlink; C++ engine dir is EMPTY in current checkout
```

⚠️ Note: `route-engine/` is a symlink to `optimise routes/`, which is empty locally. The C++ engine binary only exists on the `origin/route-optimiser` branch (see §17).

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js (ESM on the main API; CommonJS on the route bridge) |
| **Backend framework** | Express 4.21 (main API) · Express 5 (route bridge) |
| **Database** | PostgreSQL 16 (Neon serverless supported) + PostGIS image (PostGIS installed but **not actually used** — coordinates are plain numerics) |
| **DB driver** | `pg` (node-postgres) connection pool, max 20 |
| **Auth** | `jsonwebtoken` (JWT, 7-day expiry) + `bcryptjs` (cost 10) + `cookie-parser` (httpOnly signed cookies + Bearer header) |
| **Payments** | **Fully simulated** — no PSP SDK. UPI intent URIs (`upi://pay?…`), QR codes via `qrcode` npm package, fake transaction IDs / RRNs, virtual-account (VAN) details |
| **IVR** | Hand-rolled **TwiML** XML builder (no Twilio SDK) — works with any Twilio-compatible gateway; sessions persisted in Postgres |
| **Crypto** | Node `crypto` SHA-256 for CPCB EPR certificate hashes |
| **Logging** | `morgan('dev')` (skipped in test env) |
| **Frontend (SPA)** | Vite 6 + vanilla JS (`frontend/`), Vite 8 + React 19 + react-leaflet 5 + Tailwind 4 (`ecoloop-app/`) |
| **Maps** | Leaflet 1.9.4 + OpenStreetMap tiles (user.html, ecoloop-app, UI dashboard). Mapbox only on the unmerged route-optimiser branch |
| **Static portals** | Plain HTML + Tailwind CDN / hand-written CSS + inline JS |
| **C++ engine** | Custom CVRP solver (`optimise-routes` binary) bridged over stdin/stdout JSON; Catch2 tests on the route-optimiser branch |
| **Testing** | Node.js **built-in test runner** (`node --test`) — zero test dependencies |
| **Deployment** | Vercel (serverless `api/index.js` + static `frontend/dist`), Docker Compose (local Postgres) |

Root `package.json` scripts:

```jsonc
"start": "node server.js",
"dev": "nodemon server.js",
"dev:frontend" / "build": "delegates to frontend/",
"test": "node --test test/*.test.js test/bugs/*.tests.js tests/bugs/*.test.js",
"db:init": "node db/initDb.js",
"db:seed": "node db/seedDb.js"
```

---

## 4. Architecture Overview

There are **three separately-runnable backend processes**:

1. **Main marketplace API** (`server.js` → `src/app.js`, port 5000) — the entire business system below. On Vercel, `api/index.js` serves the same Express app as a serverless function.
2. **Route-optimizer API Bridge** (`ecoloop-backend/server.js`, port 3000, Express 5/CommonJS) — `POST /api/optimize` spawns the C++ `optimise-routes` binary, pipes JSON to stdin, maps returned node IDs back to `[lat, lon]`; also a mock `POST /api/ivr-dispatch`.
3. **Neon direct access from the browser** — `login.html` alone talks *directly* to Neon Serverless Postgres over HTTPS (`POST https://<neon-host>/sql` with a `Neon-Connection-String` header) for the citizen/officer login demo.

Frontend ↔ backend wiring:

| Frontend | Talks to | How |
|----------|----------|-----|
| `frontend/` SPA | Main API (port 5000) | Vite dev proxy `/api` + `/health` → `localhost:5000`; production: Vercel rewrites |
| `ecoloop-app/` React | C++ bridge (port 3000) | Hardcoded `POST http://localhost:3000/api/optimize`, 5s timeout, local Haversine fallback |
| `login.html` | Neon Postgres cloud | Browser fetch to Neon `/sql` endpoint; URI in `localStorage['ecoloop_neon_db_url']` |
| `waste-segregation.html` | Configurable classifier service | `GET /health`, `GET /classes`, `POST /predict`, `POST /predict/batch`; optional `X-API-Key`; demo mode with hash-seeded fake predictor |
| `index.html`, `user.html`, `marketplace.html`, `route-optimizer.html`, `worker-ledger.html`, `ecoloop-municipal.html`, `UI-UX/*` | **Nothing** (fully simulated/mocking their domains) | Session handoff via `sessionStorage['ecoloop_session']` from login.html |

Cross-page storage contract:
- `sessionStorage['ecoloop_session']` — written by `login.html`, read by `user.html`
- `localStorage['ecoloop_neon_db_url']` — written by login modal, read by `user.html` badge
- `localStorage['ecoloop_auth']` — JWT session for the `frontend/` SPA only
- `localStorage['ecoloop_theme']` — shared theme key (user.html, waste-segregation.html, dashboard); `login.html` and `Municipalities.html` use their own keys

---

## 5. Backend — Express API (`src/`)

### 5.1 App factory (`src/app.js`, 147 lines)
- **CORS:** `origin: true` (reflects any origin), `credentials: true`.
- **cookieParser** signed with `COOKIE_SECRET` (dev fallback committed).
- JSON + urlencoded bodies, `limit: '10mb'`; `morgan('dev')` unless `NODE_ENV=test`.
- **`GET /health`:** pings the DB (`SELECT NOW()`), returns service v2.0.0, uptime, DB latency; 503 with `database.status: 'DOWN'` on failure.
- Serves `../frontend/dist` statically if present; SPA fallback for non-`/api` GETs; JSON welcome listing all 8 modules on `/`.
- Mounts all 8 route groups under `/api/v1/…`; central `errorHandler` last.

### 5.2 Database layer (`src/config/db.js`, 83 lines)
- `pg.Pool`; prefers `DATABASE_URL`, else granular `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`.
- **SSL auto-enabled** when `NODE_ENV=production`, host contains `neon.tech`, `sslmode=require`, or `PGSSL=true`.
- Exports `pool`, `query()`, `getClient()` (for manual transactions), `pingDatabase()`.

### 5.3 Auth middleware (`src/middleware/auth.js`)
- **`authenticate`:** token from signed cookie or `Authorization: Bearer`; JWT verified with `JWT_SECRET`; **re-queries the users table on every request** (deleted users are rejected immediately); attaches `req.user`.
- **`authorizeRoles(...roles)`:** 403 if `req.user.role` not in the allow-list.

### 5.4 Error handler (`src/middleware/errorHandler.js`)
- `AppError` class with `statusCode`, `details`, `isOperational`.
- Standard error envelope `{ success: false, error }`.
- **Postgres error-code mapping:** `23505`→409 Conflict, `23503`→400, `23514`→400, `22P02`→400 ("invalid UUID format"), `ECONNREFUSED`/`28P01`/`3D000`→503.
- **Production sanitization (BUG-004 fix):** non-operational 5xx → "Internal Server Error"; `details` suppressed in production.

### 5.5 Controllers — feature by feature

#### `authController.js` (320 lines) — roles: Picker, DWCC, Recycler, ULB
- **`POST /auth/register`** — validates role/mobile/password (≥6 chars); accepts field aliases (`mobile`/`mobile_number`, `vpa`/`upi_vpa`, …); any supplied VPA is marked `VERIFIED` immediately (simulated penny-drop at onboarding); bcrypt-hashes the password; sets JWT cookie; returns `{user, token}`.
- **`POST /auth/login`** — bcrypt compare; identical 401 for unknown user and wrong password (no user enumeration); JWT cookie + body token.
- **`POST /auth/logout`** — clears the cookie.
- **`GET /auth/me`** — 🔒 returns the DB-verified session user.
- **`POST /auth/verify-vpa`** — 🔓 **simulated NPCI reverse penny-drop**: validates VPA regex `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`, derives bank from a hardcoded PSP handle map (`@sbi`, `@okhdfcbank`, `@paytm`, `@ybl`, `@apl`, …), derives holder name (registry matches on `mcd`, `bbmp`, `railway`, `iocl`, `attero`, `banyan`, `ganesha`, mobile patterns); persists `upi_vpa_status='VERIFIED'` when a matching mobile is supplied; returns `penny_drop_status: SUCCESS`, reference `PND-…`, IFSC prefix.

#### `userController.js` (165 lines) — legacy registration path
- **`POST /users`** — public; role-validated; if no password is given, generates a random 32-hex password (user can't log in without it); `verification_status` defaults to PENDING. Kept for Phase-1 compatibility.
- **`GET /users`** — public directory with `role`, `verification_status`, `limit` (1–100), `offset` filters.
- **`GET /users/:id`** — public UUID lookup.

#### `listingController.js` (325 lines) — the scrap lots
- **`POST /listings`** — public (role check inside): seller must exist with role **Picker or DWCC**; material grade validated case-insensitively against the 8 canonical grades (BUG-001 fix); `weight_kg > 0`, `min_price >= 0`; starts `OPEN`.
- **`GET /listings`** — public; filters by grade + status (defaults to OPEN+BIDDING); pagination; grouped query returns `total_bids` and `highest_bid` per listing.
- **`GET /listings/:id`** — public; full seller profile (incl. UPI VPA) + all bids.

#### `bidController.js` (201 lines) — the auction floor
- **`POST /listings/:id/bids`** — public (bidder identity from body — trust-the-client model, see §18): bidder must be a **Recycler**; listing OPEN/BIDDING; sellers can't bid on their own lots; bid ≥ min_price; **strictly greater than the current highest ACTIVE bid**; first bid flips listing OPEN→BIDDING. All inside a `BEGIN…COMMIT/ROLLBACK` transaction with row locks.
- **`GET /listings/:id/bids`** — public; bids joined to bidder role/verification, `highest_bid` included.

#### `auctionController.js` (460 lines) — settlement engine (the heart of the money flow)
- **`POST /listings/:id/payment-intent`** — 🔒 Recycler only. Creates a **PENDING escrow deposit** (15-min TTL) with:
  - UPI intent URI: `upi://pay?pa=ecoloop.escrow@icici&am=…&tr=ECOP…&cu=INR`
  - A locally-generated **QR data-URL** (`qrcode` package — no third-party QR service leaking intent data)
  - B2B **virtual account** details (beneficiary "EcoLoop Clearing & Escrow Services", IFSC `ICIC0000104`, "recommended for ≥ ₹1,00,000" — for RTGS/NEFT on big lots that exceed UPI limits).
- **`POST /listings/:id/accept-bid`** — 🔒 (seller-or-ULB check inside). One atomic transaction that:
  1. Honors `Idempotency-Key` (replays the original settlement response on retry; 409 on cross-listing key reuse)
  2. `SELECT … FOR UPDATE` on the listing; ownership check
  3. **Weight floor:** rejects lots < 0.5 kg (would violate `epr_tokens.verified_weight_mt > 0`)
  4. Picks the winning bid (explicit bid_id or highest ACTIVE, FIFO tie-break)
  5. **Escrow funding gate:** requires a SUCCESS deposit by the winning bidder ≥ the bid amount, else 409 "Escrow not funded"
  6. **Double-settlement guard:** UNIQUE index on `payouts.listing_id` + explicit check
  7. Transitions: winning bid → ACCEPTED, others → REJECTED, listing → SOLD
  8. Calls `executeUpiPayout` and inserts the immutable payout row
  9. **Mints a CPCB EPR token** (SHA-256 hash, see §9)
- **`executeUpiPayout` (simulated UPI):** split math — **seller 98.5% / platform fee 1.0% / welfare levy 0.5%**, with residual rounding (`seller_net = gross − fees`) so components sum exactly to gross in integer paise (no drift, tested to ₹12345.67 / ₹0.50 / ₹7.13). Fake `UPI-TXN-…` id + `RRN<12 digits>`.

#### `depositController.js` (114 lines) — escrow funds-in
- **`POST /deposits/:reference/confirm`** — 🔒 Recycler/ULB, owner-checked. Simulates the bank webhook: PENDING→SUCCESS with atomic guarded UPDATE (`WHERE status='PENDING'` — concurrent duplicates get 409); expired intents flip to FAILED.
- **`GET /deposits/:reference`** — 🔒 owner-checked status lookup.

#### `payoutController.js` (279 lines) — the read-side ledger
- **`GET /payouts`** — 🔒 seller's own ledger with totals.
- **`GET /payouts/all`** — 🔒 ULB audit view: filters status/seller/date range, limit 500.
- **`GET /payouts/listing/:id`** — 🔒 seller-or-ULB visibility.
- **`POST /payouts/:id/reverse`** — 🔒 ULB only. Flips payout → REVERSED and inserts a **compensating `REVERSAL` deposit** (returns gross to escrow) so funds-in/out stay reconciled.

#### `eprController.js` (235 lines) — see §9.

#### `ivrController.js` (398 lines) — Tier-1 voice intake, see §7.

#### `municipalController.js` (456 lines) — Tier-2 counters, see §7.

### 5.6 Services
- **`twiml.js`:** hand-rolled TwiML builder — `<Say language="en-IN|hi-IN">`, `<Gather>` (numDigits / finishOnKey / timeout), `<Redirect>`, `<Hangup>`, `<Pause>`; epsilon-safe `round2`; `parseWeightInput` (DTMF `12*5#` → 12.5 kg, max 5000 kg).
- **`ivrPrompts.js`:** DTMF→material map (1=PET … 8=PP), bilingual (EN/HI) prompt library with `en-IN`/`hi-IN` TTS voices, `money()` rupee formatting.

---

## 6. Database — Schema & Seed (`db/`)

### 6.1 Schema — 11 tables

| Table | Purpose | Key columns / constraints |
|-------|---------|---------------------------|
| `users` | All actors | mobile UNIQUE, password_hash, role CHECK (Picker/DWCC/Recycler/ULB), verification_status, UPI fields: `upi_vpa`, `upi_vpa_status` (UNVERIFIED/VERIFIED/FAILED), `upi_bank_account_holder`, `upi_verified_at` |
| `scrap_listings` | Scrap lots | seller FK, material_grade, weight_kg, min_price, status (OPEN/BIDDING/SOLD/CANCELLED), `mstc_lot_no`, `origin_location` |
| `bids` | Auction bids | listing FK, bidder FK, bid_amount > 0, bid_status (ACTIVE/ACCEPTED/REJECTED). Multiple bids per bidder allowed |
| `epr_tokens` | CPCB certificates | listing + recycler FK, verified_weight_mt NUMERIC(10,3) > 0, **cpcb_certificate_hash UNIQUE** |
| `payouts` | Settlement ledger | payee_vpa, gross/net/fee/levy, gateway_transaction_id UNIQUE, bank_rrn, status (PENDING/SUCCESS/FAILED/REVERSED), **UNIQUE(listing_id)** (one settlement per lot), `idempotency_key` UNIQUE |
| `deposits` | Escrow in | reference_no UNIQUE, amount_inr, channel (UPI/QR/RTGS_NEFT/REVERSAL), status, expires_at |
| `picker_profiles` | Tier registry | 1:1 users, tier (IVR/OFFLINE), language_pref (en/hi), **card_code UNIQUE** (Tier-2 QR card), home_ward, registered_by |
| `ivr_sessions` | Call state machine | call_sid UNIQUE (Twilio CallSid), caller_number, language, state, selected_material, entered_weight_kg, created_listing_id |
| `material_rates` | Official rate card | grade UNIQUE, **rate_per_kg + middleman_rate_per_kg** (the anti-middleman counterfactual) |
| `municipal_centers` | Tier-2 counters | name, ward, lat/lng, is_active |
| `direct_sales` | Tier-2 counter sales | center + picker FK, weight, **both rates snapshotted per sale**, gross_amount, middleman_uplift, payment_mode (UPI/CASH), payment_status |

Extensions: `uuid-ossp`; PostGIS attempted in a tolerated DO-block (never used).

### 6.2 Seed data (`seed.sql`, all passwords `Password@123`)
- **11 users** modeled on real Indian institutions: 4 DWCC sellers (MCD MRF Dwarka, BBMP Ward 150 Bengaluru, Western Railway Mumbai, IOCL Panipat), 2 phone pickers (Ramesh Kumar, Sunita Devi), 3 CPCB-registered recyclers (**Attero Recycling, Banyan Nation, Ganesha Ecosphere**), 1 ULB admin, 2 offline pickers with synthetic mobiles `OFF-7000000101/102`.
- **6 listings** styled as MSTC e-auction lots (PET 12.5 t @ ₹437,500 … Metal 18.5 t @ ₹647,500; one pre-SOLD Paper lot).
- 3 bids, 1 SUCCESS deposit, 1 payout matching the 98.5/1.0/0.5 split, **1 EPR token deliberately seeded with a non-recomputable hash** (SHA-256 of the empty string) so `/epr/verify` demonstrates `TAMPER_DETECTED`.
- 8 material rates (e.g., PET official ₹28 vs middleman ₹18 → 55.6% uplift), 2 municipal centers, 2 direct sales, 4 picker profiles.

---

## 7. The Two-Tier Picker Intake System

*(Design spec: `docs/two_tier_picker_system.md` — the system's flagship feature.)*

**Problem:** India's 1.5–4M informal waste pickers split into two cohorts: those with a basic feature phone but no app, and those with no phone at all. Both are forced to sell to middlemen at 30–45% below official rates.

**The unifying anchor:** one public official ₹/kg rate card (`material_rates`) drives the IVR price estimate, the counter payout, and the marketplace auction floor — and every transaction records what the middleman *would* have paid, making the income uplift measurable.

### Tier 1 — Bilingual IVR (pickers WITH a phone)
- Twilio-compatible TwiML webhooks (no SDK needed; Exotel etc. work). Session state machine persisted in `ivr_sessions` keyed by `CallSid` — auditable and resumable.
- **Flow:** `/voice` (bilingual welcome) → `/language` (1=EN, 2=HI) → `/menu`:
  - **1 — Report a collection:** material DTMF (1–8) → weight (`12*5#` = 12.5 kg, `*` = decimal, `#` = terminator) → spoken estimate at official rate → confirm → **INSERTs a real `scrap_listings` row (status OPEN, origin "Tier-1 IVR call-in")** that enters the B2B auction.
  - **2 — Today's rates:** reads every rate, contrasting official vs middleman per material.
  - **3 — Lifetime earnings:** sums SUCCESS payouts **and** direct sales across both rails.
- Caller identity resolved by **last 10 digits** of `From`; unregistered callers can hear rates but are refused collection reporting with a registration pointer.

### Tier 2 — Municipal direct-sale counters (pickers WITHOUT a phone)
- **Registration** (ULB/DWCC only): issues a physical QR card `ECO-XXXXXXXXXXXX` (unambiguous alphabet — no 0/O/1/I/L) with payload `ECOLOOP:CARD:<code>`; creates the user with a random unusable password and a synthetic `OFF-…` mobile for FK integrity; optional family UPI VPA.
- **Sale at counter:** card code + material + weighed kg + Cash/UPI → money math computes `gross = weight × official_rate`, `middlemanWouldHavePaid = weight × middleman_rate`, `uplift = gross − middlemanWouldHavePaid` (both rates **snapshotted** into the `direct_sales` row). Cash → `CASH_DISPENSED`; UPI → synthetic txn id.
- **Impact ledger:** `GET /centers/:id/sales` aggregates kg bought, ₹ paid, and **`total_middleman_cut_avoided_inr`** — the "proof of uplift" metric.

---

## 8. The Ledger / Escrow System

*(Architecture spec: `docs/upi_onboarding_and_payout_architecture.md` — implemented as a **simulated MVP** on `main`; real PSP deferred per the spec's §7 checklist.)*

**Key design principle (two-sided payments):** only **sellers (payees)** pre-register a UPI VPA; **recyclers (payers) never do**, because a payer can only be debited live in their own bank app (push, not pull). Recyclers fund escrow via:
1. **UPI intent link** (mobile) — `upi://pay?pa=ecoloop.escrow@icici&…`
2. **Dynamic QR** (desktop) — generated locally as a data-URL
3. **B2B Virtual Account Number** for RTGS/NEFT on large lots (₹4L–₹20L+) exceeding UPI per-txn limits
4. (Spec'd, not built) auction-wallet EMD reserve for binding bids

**Funds-in lifecycle:** `payment-intent` opens a PENDING deposit (15-min TTL) → simulated bank webhook `confirm` flips it to SUCCESS atomically → expired intents fail.

**Funds-out (settlement):** inside the atomic `accept-bid` transaction, gated on funded escrow ≥ winning bid. Idempotent (per-listing UNIQUE + `Idempotency-Key` replay). Split: **98.5% seller / 1.0% EcoLoop / 0.5% Waste-Collector Micro-Welfare Reserve**.

**Reversal:** ULB can reverse a payout; a compensating `REVERSAL` deposit keeps the ledger reconciled.

**Spec'd-but-deferred (§7 checklist):** real gateway sandbox, true ₹1 reverse penny-drop (Setu/RazorpayX/Cashfree), camera QR capture of a seller's own UPI standee, WhatsApp payout notifications, printable shared-custody vouchers for unbanked pickers (SHG/DWCC proxy custody).

---

## 9. EPR / CPCB Compliance Tokens

Every settled lot mints a **tamper-evident EPR certificate**:

- **Hash:** `SHA-256("listingId|recyclerId|materialGrade|weightMt|timestamp|EPR_HASH_SECRET")` — requires the `EPR_HASH_SECRET` env var (refuses to mint without it; no committed fallback).
- **Public verification:** `GET /epr/verify/:hash` recomputes the hash from the *current* listing data and compares. Outcomes:
  - Match → `verified: true, status: OFFICIALLY_REGISTERED`
  - Mismatch → `verified: false, status: TAMPER_DETECTED` (expected hash exposed)
  - Unknown hash → `verified: false`, "may be fraudulent or unissued"
- **Recycler registry:** `GET /epr/recycler/:id` returns all tokens + aggregate `total_credit_mt` — the recycler's EPR compliance credit.
- The seeded token is intentionally non-recomputable → instant tamper-detection demo.

---

## 10. Route Optimization Subsystem

Three generations coexist:

1. **Mock canvas** (`route-optimizer.html`) — hand-placed Ward-14 Pune waypoints, fill-based greedy re-sequencing, animated tricycle on `<canvas>`, "Run OR-Tools Dynamic Re-Route" / "Simulate Surge Pickup Alert" buttons. Pure theatre, no backend.
2. **Mock SVG** (`ecoloop-municipal.html`, `UI-UX/Municipalities.html`, dashboard) — 10 bins, nearest-neighbor greedy from a depot over bins above a fill-threshold slider, distance-saved stats.
3. **The real thing** — `ecoloop-app` (React 19 + Leaflet) + `ecoloop-backend` bridge + C++ CVRP engine:
   - Seed scenario: **Patiala** — depot "DWCC Central Hub" + 4 collection points with per-stream demands (`organic/dry/hw/dry_non_recyclable`) and service times; 1 truck with per-stream capacity caps and an 8-hour shift.
   - Client: click-to-add stops on the map, editable per-stream demands and vehicle caps, **capacity validation before submit**, fully-connected **Haversine edge list** generated client-side, payload `{action:"optimize_ward", vehicles, nodes, edges, unassigned_stops}` → `POST /api/optimize` → green Polyline of `optimized_waypoints`. 5s abort timeout; on any failure a **local fallback simulated route** is shown with a status note. A "Tier 3: Depot Intake" form logs no-phone worker deposits locally.
   - Bridge (`ecoloop-backend/server.js`): spawns `../route-engine/build/optimise-routes`, JSON over stdin/stdout, maps node IDs → `[lat,lon]`.
   - ⚠️ **The C++ engine source/binary is not in the current checkout** (`route-engine → optimise routes/` is empty). The complete engine — including Mapbox road-distance matrix, disposal-aware 2-opt, multi-vehicle UI, Google-Maps export — lives on the **`origin/route-optimiser` branch** (6 unmerged commits, see §17). It needs `MAPBOX_ACCESS_TOKEN` in `ecoloop-backend/.env` for road distances.

---

## 11. Frontends

### 11.1 `frontend/` — the production B2B marketplace SPA (Vite + vanilla JS)
**The only frontend wired to the real Express API.** 4 tabs + modals, dark theme, demo sign-in selector of all 11 seeded accounts (auto-login with `Password@123`).

- **Marketplace tab:** live listing grid (MSTC lot badge, origin, weight in MT, reserve, top bid, seller CPCB reg), grade/status filters, create-listing modal (seller select of pickers/DWCCs).
- **Live Auctions tab:** bid form with smart minimum (must exceed `highest_bid + 1`, or ≥ reserve if no bids — the BUG-005 fix, `step="any"`), bid history, payment-rails modal (UPI intent / QR / B2B VAN + "Simulate Bank Confirmation" to fund escrow).
- **CPCB EPR Audit tab:** paste any 64-hex hash → verified certificate card, or tamper/fraud states with expected-vs-stored hash diff.
- **Payouts Ledger tab:** seller view or ULB audit view (status filter, gross/net/fee/levy/RRN table, **Reverse** button).
- **Seller UPI Onboarding modal:** role, org, mobile, password, optional CPCB ref, settlement VPA + **Verify Bank** (penny-drop card with holder name, bank, IFSC prefix).
- Exact endpoints consumed: `/health`, `GET/POST /listings`, `GET/POST /listings/:id/bids`, `POST /listings/:id/accept-bid`, `POST /listings/:id/payment-intent`, `POST /deposits/:ref/confirm`, `GET /epr/verify/:hash`, `POST /auth/verify-vpa`, `POST /auth/register`, `POST /auth/login`, `GET /payouts(…/all)`, `POST /payouts/:id/reverse`.

### 11.2 Static HTML portals (root) — the hackathon demo suite
| Page | What it demonstrates |
|------|----------------------|
| `index.html` | "Municipal Command Center" landing: splash intro, live mandi-rate ticker, KPI grid, portal gateway cards. No API. |
| `login.html` | Dual-role auth (Citizen OTP / Municipal officer ID+password) with trilingual UI (EN/HI/PA), lockout after failures, and a **Neon DBMS console modal** (paste connection string → ping → auto-create schema → run raw SQL — all from the browser). Demo OTP hardcoded `123456`; seeds citizen 9876543210 and officer `DEMO-1001 / Demo@1234`. |
| `user.html` | Citizen dashboard: SWaCH driver tracking on **Leaflet** (with a "Simulate Driver Approach" button that awards +6 credits), Green Credit Score SVG ring + tier system, **Woohoo (Pine Labs) voucher redemption** (6 brands, simulated issuance with codes/PINs/PO refs), credit ledger, rule-based bilingual **AI assistant** (5 languages: EN/HI/MR/TA/BN), glassmorphic dual-theme design system. No fetch calls. |
| `marketplace.html` | Simulated B2B auction for Lot #PET-2026-09: live countdown, bid tape, NIR lab telemetry, confetti + CPCB EPR mint modal. |
| `route-optimizer.html` | Simulated OR-Tools CVRP view: animated canvas ward map, surge alerts, dispatch queue. |
| `waste-segregation.html` | Real configurable client for an AI waste-photo classifier (`/health`, `/classes`, `/predict`, `/predict/batch`; X-API-Key auth; client-side downscaling to ≤1280px; graceful **demo mode** with a hash-seeded fake predictor). |
| `worker-ledger.html` | Mock worker mobile app: QR household audit simulation (Grade A/B/C tokens), BLE scale telemetry with tare/adjust, per-kg payout equation, simulated UPI disbursal with UTR, EN/MR switch, USSD/SMS fallback panel. |
| `ecoloop-municipal.html` | 3-view municipal portal (routes/market/workers) with the design system; mirrors the real system's concepts. |

### 11.3 `UI-UX/` — prototypes
- `Municipalities.html` — earlier teal-styled version of the municipal portal (greedy route planner, offer comparison, picker ledger).
- `Municipal_Direct_Sales.html` — **Tier-2 counter-desk demo**: card-code scan chips, Cash/UPI toggle, live uplift calculation box, rate card with uplift %, offline-picker registration generating `ECO-` cards. Mirrors the real municipal endpoints in UI copy (no fetches).
- `IVR_Simulator.html` — **Tier-1 call simulator**: CSS phone, 12-key keypad, scrolling transcript, **live TwiML XML panel** mirroring the real webhook paths and prompt library, state-machine chips.
- `DASHBOARD/index.html` — the pitch site: Japanese editorial aesthetic, animated closed-loop ring SVG, scrollytelling, dealer-vs-EcoLoop earnings calculator, impact projections, team page.

---

## 12. Design System (`DESIGN_SYSTEM.md`, 688 lines)

**"Cyber-Industrial Circular Economy"** aesthetic, implemented across the portals:

- **Two themes:** Dark Luxury (default; obsidian `#0a0e17`, bioluminescent emerald/cyan, glassmorphic panels, radial ambient gradients) and Clean Solar Light (`#f8fafc`, darkened accessible accents). Switched via `data-theme` attribute, persisted in `localStorage['ecoloop_theme']`, full WCAG AA contrast guidance.
- **Typography:** Outfit (headings/numbers) + Plus Jakarta Sans (body) + monospace **mandatory for all financial/crypto data** (hashes, UTRs, VPAs, weights). Signature emerald→cyan gradient text.
- **Tokens:** complete dual-theme CSS variable table (`--bg-main`, `--bg-card` glass rgba, `--border-subtle`, `--emerald-*`, `--cyan-*`, shadows, radii, `cubic-bezier(0.16,1,0.3,1)` transitions) with copy-paste CSS.
- **Components:** navbar with pill menu, glass cards with hover lift, 48px-min buttons, status tags (OPEN emerald / BIDDING amber / SOLD muted), form focus rings, stat cards, data tables, modal scale-in animations, Tailwind JSX snippets.
- **Rules:** no pure black/white, no hardcoded colors, no sub-44px touch targets, always test both themes.

---

## 13. API Surface — Complete Reference

Legend: 🔓 public · 🔒 `authenticate` · role guard in parentheses. Base: `/api/v1`.

### Health & root
| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | 🔓 |
| GET | `/` | 🔓 (HTML welcome or JSON module list) |

### `/api/v1/auth`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/register` | 🔓 | Role ∈ {Picker, DWCC, Recycler, ULB}; auto-VERIFIED VPA |
| POST | `/login` | 🔓 | JWT cookie + body token |
| POST | `/logout` | 🔓 | |
| POST | `/verify-vpa` | 🔓 | Simulated penny-drop |
| GET | `/me` | 🔒 | DB-verified session |

### `/api/v1/users` (all public — legacy path)
| Method | Path |
|--------|------|
| POST | `/` |
| GET | `/` (?role & verification_status & limit & offset) |
| GET | `/:id` |

### `/api/v1/listings`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/` | 🔓* | *Seller must be Picker/DWCC (checked inside) |
| GET | `/` | 🔓 | Filters: material_grade, status; defaults OPEN+BIDDING |
| GET | `/:id` | 🔓 | |
| POST | `/:listing_id/bids` | 🔓* | *Bidder must be Recycler (body `bidder_id`) |
| GET | `/:listing_id/bids` | 🔓 | |
| POST | `/:listing_id/payment-intent` | 🔒 (Recycler) | Opens escrow deposit |
| POST | `/:listing_id/accept-bid` | 🔒 (seller/ULB inside) | Atomic settlement + EPR mint |

### `/api/v1/deposits`
| Method | Path | Auth |
|--------|------|------|
| GET | `/:reference` | 🔒 (Recycler/ULB, owner) |
| POST | `/:reference/confirm` | 🔒 (Recycler/ULB, owner) |

### `/api/v1/epr` (all public)
| Method | Path |
|--------|------|
| GET | `/verify/:hash` |
| GET | `/tokens/:id` |
| GET | `/recycler/:recycler_id` |

### `/api/v1/payouts`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | 🔒 (own) |
| GET | `/all` | 🔒 (ULB) |
| GET | `/listing/:listing_id` | 🔒 (seller/ULB) |
| POST | `/:payout_id/reverse` | 🔒 (ULB) |

### `/api/v1/ivr` — Twilio webhooks (public, unauthenticated)
| Method | Path | Step |
|--------|------|------|
| POST | `/voice` | Bilingual welcome |
| POST | `/language` | 1=EN, 2=HI |
| POST | `/menu` | 1 collect / 2 rates / 3 earnings |
| POST | `/collection/material` | DTMF 1–8 |
| POST | `/collection/weight` | `12*5#` → 12.5 kg |
| POST | `/collection/confirm` | Creates OPEN listing |

### `/api/v1/municipal`
| Method | Path | Auth |
|--------|------|------|
| GET | `/centers` | 🔓 |
| GET | `/rates` | 🔓 (official + middleman + uplift %) |
| POST | `/centers` | 🔒 (ULB) |
| POST | `/pickers/offline` | 🔒 (ULB/DWCC) — issues ECO- card |
| GET | `/pickers/offline` | 🔒 (ULB/DWCC) — lifetime totals |
| POST | `/centers/:centerId/sales` | 🔒 (ULB/DWCC) — direct sale + uplift math |
| GET | `/centers/:centerId/sales` | 🔒 (ULB/DWCC) — ledger + impact totals |

### Route bridge (`ecoloop-backend`, port 3000)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/optimize` | Spawns C++ CVRP engine |
| POST | `/api/ivr-dispatch` | Mock Tier-2 dispatch TTS |

---

## 14. Deployment & Configuration

### Environment variables (`.env.example`)
| Var | Purpose |
|-----|---------|
| `PORT`, `NODE_ENV` | Server basics |
| `DATABASE_URL` *or* `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` | Postgres (Neon URLs auto-SSL) |
| `PG_MAX_POOL`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECTION_TIMEOUT_MS`, `PGSSL` | Pool tuning |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_SECRET` | Auth (dev fallbacks committed — see §18) |
| `EPR_HASH_SECRET` | **Mandatory** for settlement & EPR verification (500 if missing) |
| `MAPBOX_ACCESS_TOKEN` | Route bridge only (route-optimiser branch) |

No Twilio credentials exist — the IVR integration only needs publicly reachable webhook URLs (point Twilio's "A Call Comes In" at `/api/v1/ivr/voice`; production should validate `X-Twilio-Signature`, not yet implemented).

### Deployment targets
- **Vercel:** `vercel.json` builds `frontend/` → `frontend/dist`; rewrites `/api/(.*)` and `/health` → `api/index.js` (the Express app as serverless), everything else → SPA.
- **Docker:** `docker-compose.yml` runs `postgis/postgis:16-3.4` with `schema.sql` + `seed.sql` auto-mounted into `/docker-entrypoint-initdb.d/` — a fresh container is fully seeded; `pg_isready` healthcheck.
- **Local dev:** `docker compose up -d` (or any Postgres) → `npm run db:init && npm run db:seed` → `npm run dev` (API :5000) + `npm run dev:frontend` (SPA :3000, proxied). Route bridge separately: `cd ecoloop-backend && node server.js` (:3000). React app: `cd ecoloop-app && npm run dev`.

---

## 15. Testing Strategy

**Framework:** Node.js built-in test runner (`node --test`), `node:assert/strict` — zero test dependencies. **The repo's iron convention: `npm test` never touches Postgres.** Two mechanisms:

1. **Fake pg pool** (`test/tier_system.test.js` only): an in-memory `createFakeDb()` whose `handle()` pattern-matches the *exact SQL strings* the controllers issue; installed by monkey-patching `pool.query`; any unmatched SQL throws — a strict contract.
2. **DB-free controller invocation** (all other suites): controllers called with mock `req/res/next`; HTTP suites boot the real Express app on an ephemeral port and only hit paths that fail validation before any DB access.

### Suites & coverage (~98 test cases total)

| Suite | Cases | Covers |
|-------|-------|--------|
| `tier_system.test.js` (753 ln) | 36 | TwiML unit tests (DTMF, XML escape, TTS voices, EN/HI prompt parity); full IVR flow (language, menu, rates-with-middleman-counterfactual, earnings, unregistered refusal, happy path PET 12.5 kg → listing); Tier-2 (rate-card uplift math, 401/403 guards, card issuance regexes, CASH/UPI sales, inactive centers, impact totals) |
| `phase2_auth_auction_epr.test.js` | 15 | Auth validation & cookies; auction guards; **payout-split paise-exactness for 6 amounts**; SHA-256 determinism + avalanche effect on weight tampering |
| `ledger_lifecycle.test.js` | 14 | All ledger endpoints 401-guarded; payout/deposit validation branches; EPR_HASH_SECRET governance |
| `e2e_and_edge_cases.test.js` | 17 | Routing, health up/down, 404/400 envelopes, **SQL-injection inputs fail cleanly**, malformed UUIDs/JSON |
| `validation.test.js` | 9 | Error-handler PG-code mapping; user/listing/bid validation units |
| `test/bugs/` + `tests/bugs/` (byte-identical duplicates, both globbed) | 7 | Regression tests for BUG-001…004 (see §16) |

---

## 16. Bug Log (BUG-001 … BUG-005)

From `db/bug_log.md` — methodology: Replicate → Write Failing Test → Trace Root Cause → Minimal Fix → Verify & Break → Document.

| ID | Severity | Symptom | Root cause | Fix |
|----|----------|---------|-----------|-----|
| **BUG-001** | Medium | `POST /listings` accepted arbitrary strings ("ToxicChemicalWaste", SQL injection) as `material_grade` | Only checked non-empty string | `ALLOWED_MATERIAL_GRADES` enum with case-insensitive matching before any DB query |
| **BUG-002** | High | Registration accepted non-numeric text as mobile numbers | Length-only check | `MOBILE_REGEX = /^\+?[0-9]{10,15}$/` |
| **BUG-003** | Low | `GET /users?verification_status=<garbage>` passed straight to SQL | Unvalidated filter | Enum whitelist → 400 |
| **BUG-004** | High | Unexpected 500s leaked internal error messages (DB connection strings, table names) in production | No sanitization | Non-operational 5xx → "Internal Server Error" in production; details suppressed |
| **BUG-005** | Medium | Valid bids rejected by the browser ("nearest valid values are 26751 and 26801") | HTML `step="50"` + dynamic `min` misalignment | `step="any"` + JS-enforced minimum (`highestBid + 1`); committed as `f816084` |

Plus session-plan-driven fixes (from the `.zcode/plans` ledger session): sub-0.5 kg settlement crash (weight floor guard), payout rounding drift (residual method), rollback masking in transactions, QR generated locally instead of leaking intent data to `api.qrserver.com`, persisted penny-drop results.

---

## 17. Git History & Branch Status

~32 commits from `d2fbe82 Initial commit` to `589b869`. **`main` == `origin/main` (in sync).**

### Merged into main
- **PR #1** — early route-optimiser work (dynamic VRP payload, Haversine edges, capacity validation)
- **PR #2** (`tier-system`, `b9ec008`) — the full two-tier picker intake system (IVR + municipal counters + 36-test suite)
- `abe7e9e` "ledger_finalised" — escrow deposits, payout read API, reversal, idempotency, auth hardening
- `9d73ad0` — citizen/login portals, design system, Neon integration

### Unmerged work on remote branches ⚠️
| Branch | Unmerged commits | Contains |
|--------|------------------|----------|
| `origin/route-optimiser` | **6** | C++ engine folded into repo; loop-guard/disposal-aware 2-opt fixes (36 Catch2 tests); **Mapbox road-distance matrix**; multi-vehicle fleet UI with per-route colors (fallback simulation removed); Patiala scenario seed; turn-by-turn "Open in Google Maps" export + `POST /api/route-geometry` |
| `origin/Ledger` | **2** (diverged from main at `8d06f31`) | IWL worker ledger stack: `iwlPayoutController` (308 ln), `workerWeighInController` (670 ln), `workerProfileController` (464 ln), `whatsappVoiceController` (268 ln), `marketplaceGovController` (877 ln), new schemas (`schema_iwl.sql`, `schema_v3_gov_differentiators.sql`), React pages (b2b-marketplace, epr-registry, main-dashboard), dark mode. **Test tree diverges** — has its own suites, lacks tier_system/ledger_lifecycle tests |
| `origin/B2B` | 1 (contained in Ledger) | `bankVerificationService.js` (570 ln), bank-verification tests, `FEASIBILITY_ANALYSIS.md` (421 ln) |
| `origin/UI/UX` | 1 | `UI-UX/Municipality/index.html` (Divyanshu Batta) |

Local branches `route-optimiser` and `tier-system` point at pre-merge tips (their content is in main).

---

## 18. Known Caveats & Security Notes

Honest inventory of what is simulated, unguarded, or divergent — important context for anyone extending this:

1. **All money is simulated.** No PSP SDK, no real UPI/NPCI calls; every transaction ID, RRN, and penny-drop is synthetic by design (documented deferral in the UPI architecture doc §7).
2. **Trust-the-client endpoints:** `POST /listings` and `POST /listings/:id/bids` have **no auth middleware** — seller/bidder identity comes from the request body. The SPA works because it's a demo; this is the biggest real-security gap.
3. **IVR webhooks are unauthenticated** by design (Twilio posts form data); `X-Twilio-Signature` validation is noted as a production TODO.
4. **CORS is fully open** (`origin: true`, credentials allowed).
5. **Dev fallback secrets committed** (`JWT_SECRET`, `COOKIE_SECRET`) — fine for local, must be overridden in any real deployment. Demo passwords (`Password@123`, login.html's `Demo@1234`, OTP `123456`) are seeded/intentional.
6. **Two divergent registration paths** (`/auth/register` auto-VERIFIED vs legacy `/users` PENDING with auto-generated passwords).
7. **The C++ route engine is absent from the current checkout** — exists only on `origin/route-optimiser`.
8. **`origin/Ledger` contains a large, valuable body of work** (IWL worker ledger, gov differentiators, bank verification) that has diverged from main and would need a careful merge (its test tree conflicts).
9. **PostGIS is installed but unused**; municipal center coordinates are plain numerics.
10. **Most root HTML portals are pure front-end simulations** — by design (hackathon demo suite); only `frontend/`, `login.html` (Neon), and `waste-segregation.html` (classifier) perform real network calls.
11. `userController.listUsers` returns `total: rowCount` — which counts the *fetched page*, not the full table (a pagination-count quirk).
12. `users.upi_verified_at` has `DEFAULT NOW()`, which back-dates rows that never went through verification.

---

## 19. Quick-Start Cheat Sheet

```bash
# Database (Docker, auto-seeded)
docker compose up -d

# or without Docker (any Postgres + .env)
npm run db:init && npm run db:seed

# Main API on :5000
npm run dev

# Marketplace SPA on :3000 (proxies /api to :5000)
npm run dev:frontend

# Route-optimizer bridge on :3000 (needs the C++ binary on route-optimiser branch)
cd ecoloop-backend && npm i && node server.js

# React optimizer UI
cd ecoloop-app && npm i && npm run dev

# Tests (DB-free, always)
npm test
```

**Demo logins (seeded):** any of the 11 accounts, mobile `+919876543210`…`+919876543240` (or the SPA's account dropdown), password `Password@123`. Roles: pickers `…3210/3211`, DWCC `…3220-223`, recyclers `…3230-232`, ULB `…3240`.

---

*End of document. Generated from a full-repository analysis of every source file, test suite, design doc, and the complete git history across all branches.*
