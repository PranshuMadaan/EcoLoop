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

EcoLoop consists of three core technical pillars:

```
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

### 1. Spatial Route Optimizer *(Pre-Built Engine)*
- **Tech Stack**: Python 3.12, PostGIS, Google OR-Tools, Leaflet.js
- **Function**: Dynamic vehicle routing based on real-time bin/ward fill levels to optimize municipal truck collection paths.

### 2. B2B Digital Scrap Marketplace *(Core Build #1)*
- **Tech Stack**: Node.js, Express.js, PostgreSQL, React Native
- **Function**: Transparent price discovery and auction engine connecting informal pickers/DWCC micro-hubs directly with authorized recyclers, eliminating middleman price opacity.

### 3. Informal Worker Digital Ledger / IWF *(Core Build #2)*
- **Tech Stack**: React Native PWA, WhatsApp Bot API, Razorpay UPI API
- **Function**: Low-friction mobile interface for weight verification, rate lookups, and instant UPI payout tracking tailored for low-literacy adoption.

---

## 💻 Tech Stack

- **Backend Framework**: Node.js (ES Modules), Express.js
- **Database**: PostgreSQL with PostGIS extension for spatial queries
- **Authentication**: JWT, `bcryptjs`, `cookie-parser` (HTTP-Only Secure Cookies)
- **Cryptography**: Node.js `crypto` (SHA-256 for CPCB EPR audit hashes)
- **Frontend / Mobile**: React Native PWA, WhatsApp Business Cloud API
- **Payment Gateway**: Razorpay Instant UPI Payout API Integration

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- PostgreSQL (v14+ with PostGIS extension)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/ecoloop-backend.git
cd ecoloop-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecoloop_db
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Database Setup & Seed
```bash
# Run PostgreSQL schema and seed mock data
psql -U postgres -d ecoloop_db -f db/schema.sql
psql -U postgres -d ecoloop_db -f db/seed.sql
```

### 5. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
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

## 🚀 Key API Endpoints

### 🔐 Authentication (`/api/v1/auth`)
- `POST /register` — Register a new user (`Picker`, `DWCC`, `Recycler`, `ULB`).
- `POST /login` — Authenticate user & attach HTTP-Only JWT cookie.
- `GET /me` — Verify cookie & restore user session on app open.
- `POST /logout` — Clear session cookies.

### 📦 Scrap Listings & Bidding (`/api/v1/listings`)
- `POST /` — Create a new scrap listing (`Picker` / `DWCC`).
- `GET /` — Fetch active marketplace listings filtered by `material_grade`.
- `POST /:id/bids` — Place a concurrency-safe bid (`Recycler` only, PostgreSQL row-locking).
- `POST /:id/accept-bid` — Accept winning bid & close auction (`Seller` only).

### 🏛️ Compliance & Payouts (`/api/v1/compliance`)
- `POST /payouts/instant-upi` — Trigger mock Razorpay instant UPI payment to seller.
- `POST /epr/generate-token` — Generate SHA-256 cryptographic EPR compliance certificate hash.
- `GET /epr/verify/:hash` — Public verification endpoint for corporate EPR compliance.

---

## 📜 Regulatory Grounding & Compliance Frameworks

EcoLoop's workflows are strictly aligned with Indian national policies:
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
