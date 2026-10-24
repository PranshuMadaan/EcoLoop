# ♻️ EcoLoop: Intelligent Urban Waste & Informal Recycling Ecosystem

> **TIET Japan Hackathon Proposal** — *Mitsui & Co. Problem Statement*  
> **Developed by Team EcoMirai**: Aayush Garg (Leader), Divyanshu Batta, Pranshu Madaan, Mrigank Choudhary

---

## 🌟 Overview

**EcoLoop** is a modular, data-driven circular waste management platform designed to bridge informal waste collection with formal B2B recycling markets across Indian urban municipalities. 

By replacing uncoordinated dumping with verified digital transactions, EcoLoop empowers informal waste pickers, optimizes municipal logistics, and provides corporate brand owners with 100% auditable Extended Producer Responsibility (**EPR**) compliance certificates.

---

## 🎯 Key Impact Metrics & Baseline Target Goals

- **Urban Waste Diversion**: Projected municipal landfill diversion of **up to 65%+**.
- **Worker Empowerment**: Projected daily income boost **up to 2.3x** (from ₹280/day baseline to ₹650+/day).
- **Logistical Efficiency**: Projected municipal vehicle fleet fuel and distance reduction of **up to 27%**.
- **Municipal Fiscal Impact**: Projected annual savings of **up to ₹2.6 Crore/year** per 100,000 population ward in reduced tipping and transport costs.

---

## 🏗️ System Architecture & Core Modules

```text
                  +-----------------------------------+
                  |      Gamified Household UI        |
                  |  (Source Segregation & QR Scans)  |
                  +-----------------+-----------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|                   1. SPATIAL ROUTE OPTIMIZER                      |
|      (Pre-Built Python / PostGIS / OR-Tools Fleet Engine)          |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|               2. INFORMAL WORKER DIGITAL LEDGER (IWF)             |
|    (Low-literacy WhatsApp Bot + React Native PWA + Instant UPI)   |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|                3. B2B DIGITAL SCRAP MARKETPLACE                   |
|    (Transparent Price Discovery + Live Auctions + CPCB EPR Hashes) |
+-----------------------------------------------------------------------+
```

---

## 📂 Project Structure

```text
EcoLoop/
├── api/
│   └── index.js                  # Vercel serverless function entrypoint
├── frontend/                     # Modern Web Client (Vite + Vanilla CSS)
│   ├── src/
│   │   ├── main.js               # Client controller (auctions, ledger, listings)
│   │   └── style.css             # Glassmorphic responsive design system
│   ├── index.html                # Unified web application interface
│   ├── package.json
│   └── vite.config.js
├── src/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool & health ping
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, logout, HTTP-only JWT cookies
│   │   ├── userController.js     # User profiles & role filtering
│   │   ├── listingController.js  # Scrap listings, filters & joins
│   │   ├── bidController.js      # Concurrency-safe bidding engine (FOR UPDATE)
│   │   ├── auctionController.js  # Bid acceptance, instant UPI payout, EPR token minting
│   │   └── eprController.js      # CPCB compliance verification & certificate checks
│   ├── routes/
│   │   ├── authRoutes.js         # /api/v1/auth
│   │   ├── userRoutes.js         # /api/v1/users
│   │   ├── listingRoutes.js      # /api/v1/listings (including /bids and /accept-bid)
│   │   └── eprRoutes.js          # /api/v1/epr (including public /verify/:hash)
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & authorizeRoles() guards
│   │   └── errorHandler.js       # Centralized error handler with Postgres error mapping
│   └── app.js                    # Express app configuration & middleware
├── db/
│   ├── schema.sql                # Complete schema (users, scrap_listings, bids, epr_tokens)
│   ├── seed.sql                  # Seed data with bcrypt hashed passwords & sample tokens
│   ├── bug_log.md                # 6-step debugging and resolution audit trail
│   ├── initDb.js                 # npm run db:init migration script
│   └── seedDb.js                 # npm run db:seed script
├── test/
│   ├── validation.test.js        # Unit & validation tests
│   ├── e2e_and_edge_cases.test.js# HTTP routing & edge case tests
│   ├── phase2_auth_auction_epr.test.js # Auth, auction finalization, UPI & EPR tests
│   └── bugs/                     # Bug reproduction test suites
├── vercel.json                   # Unified deployment configuration
├── docker-compose.yml            # 1-click PostGIS 16 Docker container
├── .env.example                  # Environment configuration template
├── package.json                  # Root build and test scripts
└── server.js                     # HTTP server entrypoint
```

---

## 🗄️ Database Schema Summary

The core relational database entities are structured as follows:

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| `users` | Stores accounts & roles (`Picker`, `DWCC`, `Recycler`, `ULB`) | `user_id`, `mobile_number`, `password_hash`, `role`, `upi_vpa` |
| `scrap_listings` | Material listings created by pickers/DWCCs | `listing_id`, `seller_id`, `material_grade`, `weight_kg`, `min_price`, `status` |
| `bids` | Live recycler auction bids | `bid_id`, `listing_id`, `bidder_id`, `bid_amount`, `bid_status` |
| `epr_tokens` | CPCB EPR compliance certificate audit logs | `token_id`, `listing_id`, `recycler_id`, `cpcb_certificate_hash` |

---

## 📡 API Endpoints

### 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Register (`role`, `mobile_number`, `password`, `upi_vpa`) & set cookie.
- `POST /api/v1/auth/login` — Authenticate with mobile & password; issues HTTP-Only cookie.
- `POST /api/v1/auth/logout` — Clears authentication cookie.
- `GET /api/v1/auth/me` — Fetch current session profile (`req.user`).

### 2. Users (`/api/v1/users`)
- `POST /api/v1/users` — Register user profile.
- `GET /api/v1/users` — List users filtered by `?role=Picker|DWCC|Recycler|ULB`.
- `GET /api/v1/users/:id` — Fetch user by UUID.

### 3. Scrap Listings & Auctions (`/api/v1/listings`)
- `POST /api/v1/listings` — Create listing (`seller_id`, `material_grade`, `weight_kg`, `min_price`).
- `GET /api/v1/listings` — List active listings (`?material_grade=PET` and `?status=OPEN|BIDDING|SOLD|ALL`).
- `GET /api/v1/listings/:id` — Fetch single listing with seller info and current bid stats.
- `POST /api/v1/listings/:listing_id/bids` — Place auction bid (atomically locks row `FOR UPDATE`).
- `GET /api/v1/listings/:listing_id/bids` — View bid ladder for a listing.
- `POST /api/v1/listings/:listing_id/accept-bid` — **Finalize auction**:
  - Sets winning bid to `ACCEPTED` and others to `REJECTED`.
  - Sets listing to `SOLD`.
  - Triggers **instant simulated UPI payout** to seller VPA.
  - Automatically mints **CPCB SHA-256 EPR Compliance Certificate Token**.

### 4. CPCB EPR Compliance Tokens (`/api/v1/epr`)
- `GET /api/v1/epr/verify/:hash` — **Public CPCB Audit endpoint**: Cryptographically verifies certificate authenticity via SHA-256 hash.
- `GET /api/v1/epr/tokens/:id` — Fetch full EPR token record.
- `GET /api/v1/epr/recycler/:recycler_id` — List all EPR credits earned by a recycler in Metric Tonnes (MT).

---

## 🚀 Getting Started

### 1. Configure Environment
Update `.env` with your PostgreSQL credentials:
```env
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ecoloop_db
JWT_SECRET=ecoloop_super_secret_jwt_key_2026_dev_auth
COOKIE_SECRET=ecoloop_secure_cookie_signer_secret
EPR_HASH_SECRET=cpcb_epr_audit_hash_salt_key_2026
```

### 2. Launch Database
```bash
# Using Docker
docker compose up -d

# Or apply migrations manually
npm run db:init
npm run db:seed
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Start Local Development
```bash
# Start backend
npm run dev

# Start frontend
npm run dev:frontend
```

---

## 📜 Regulatory Grounding & Compliance Frameworks

1. **Solid Waste Management (SWM) Rules 2016 / 2026**: Mandates 3-stream source segregation and municipal integration of informal waste pickers.
2. **Plastic Waste Management Rules & CPCB Portal**: Enables 100% digital traceability for post-consumer plastic recycling certificates.
3. **SATAT Bio-CNG Initiative**: Facilitates wet organic waste feedstock delivery to regional anaerobic digesters with guaranteed PSU off-take at ₹46/kg.

---

## 👥 Team EcoMirai

- **Aayush Garg** — *Team Leader & Backend Architect*
- **Divyanshu Batta** — *Mobile & PWA Developer*
- **Pranshu Madaan** — *Frontend & UI/UX Engineer*
- **Mrigank Choudhary** — *Data & Cloud Infrastructure Engineer*

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
