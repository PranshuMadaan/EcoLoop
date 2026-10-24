# EcoLoop 2-Tier Picker Intake System

> Rectifying how informal rag pickers plug into the formal recycling economy in
> Indian cities — one system, two intake channels, one transparent price.

## The Problem

Indian cities have ~1.5–4 million informal waste pickers. They fall into two
very different technology cohorts:

| Cohort | Has a phone? | Today's reality |
| :--- | :--- | :--- |
| **Tier 1** | ✅ Basic phone (often feature phone, low literacy) | No digital entry point; apps/PWAs unusable |
| **Tier 2** | ❌ No phone at all | Forced to sell to middlemen at 30–45% below market |

EcoLoop therefore intakes collections through **two tiers**, both settled at the
same **official municipal rate card** — eliminating the middleman margin for
everyone.

```
                         ┌────────────────────────────────────┐
        TIER 1           │   IVR VOICE LINE (Twilio-compatible)│
   picker with phone ───▶│   "Press 1 for English,             │
                         │    press 2 for Hindi"               │
                         │   report collection via DTMF keys   │
                         └───────────────┬────────────────────┘
                                         │ scrap_listings (status OPEN)
                                         ▼
                         ┌────────────────────────────────────┐
                         │   B2B SCRAP MARKETPLACE (auctions, │
                         │   UPI payouts, CPCB EPR tokens)    │
                         └───────────────▲────────────────────┘
                                         │ direct_sales ledger (cash / UPI at counter)
        TIER 2           ┌───────────────┴────────────────────┐
   picker w/o phone ────▶│   MUNICIPAL DIRECT-SALE COUNTERS   │
   (physical QR card)    │   card code + weigh + instant pay  │
   keeps normal routes   │   at OFFICIAL rates (no middlemen) │
                         └────────────────────────────────────┘
```

---

## Tier 1 — Voice IVR (pickers WITH a phone)

A picker dials the EcoLoop line. No smartphone, no literacy, no data plan
needed — just a keypad. The flow is a persisted state machine
(`ivr_sessions`), so every call is auditable and resumable.

### Call flow

```
/voice ──► bilingual welcome + <Gather numDigits=1>
              "Thank you for calling EcoLoop. For English, press 1."
              "हिंदी के लिए 2 दबाइए।"
   │
   ├─ Digits=1 ─► English menus      ├─ Digits=2 ─► Hindi menus (hi-IN voice)
   │              (en-IN voice)      │
   ▼                                  ▼
/menu  (main menu, chosen language)
   ├─ 1  report collection  ─► /collection/material (keys 1–8 = 8 material grades)
   │                            └► /collection/weight  ("12*5#" = 12.5 kg; * = decimal)
   │                               └► /collection/confirm (official-rate estimate spoken,
   │                                  1 confirms → scrap listing created at rate floor)
   ├─ 2  today's rates      ─► official ₹/kg per material AND what middlemen pay
   ├─ 3  my earnings        ─► lifetime payouts across marketplace + counter rails
   └─ 0  repeat menu
```

### How it works

- **Caller identity**: the caller's number (last 10 digits) is matched to a
  registered `Picker` in `users`. Unregistered callers can still hear rates,
  but are routed to the nearest municipal centre to register.
- **Language**: `1` = English, `2` = Hindi. Every prompt exists in both
  languages (`src/services/ivrPrompts.js`); Hindi is spoken with an `hi-IN`
  TTS voice.
- **Pricing**: the estimate uses the official `material_rates` card; the
  listing floor price (`min_price`) = weight × official rate, so auction bids
  start *above* what a middleman would have paid.
- **DTMF conventions**: `*` is the decimal separator (keypads have no `.`),
  `#` terminates free-length entry (weight).
- **Audit**: each call, keypress path, material, weight, and created listing
  are persisted in `ivr_sessions`.

### Wiring a real phone line (Twilio example)

1. Buy a number and set the **A Call Comes In** webhook to
   `https://<your-host>/api/v1/ivr/voice` (HTTP POST).
2. Twilio POSTs `CallSid`, `From`, and each `Digits` gather result to the
   configured `action` URLs — which are exactly the endpoints above.
3. In production, validate `X-Twilio-Signature` at the edge; the endpoints are
  otherwise open so gateways and simulators can drive them.

---

## Tier 2 — Municipal direct-sale counters (pickers WITHOUT a phone)

These pickers **keep their normal daily collection routes** — nothing about
their work changes except *who buys*. Instead of selling the day's haul to a
middleman at a discount, they walk it into a municipal direct-sale counter:

1. **Registration** (`POST /api/v1/municipal/pickers/offline`, ULB/DWCC only):
   an operator registers the picker and EcoLoop issues a **physical QR card
   code** (`ECO-XXXXXX`, unambiguous alphabet so it can be read aloud or
   handwritten). No phone number exists for these pickers; they get a
   synthetic `OFF-…` identifier in `users` purely for FK integrity.
2. **Sale at the counter** (`POST /api/v1/municipal/centers/:id/sales`):
   operator scans/types the card code, picks the material, enters the weighed
   kg. EcoLoop snapshots the official and middleman rates, computes the payout,
   and pays instantly — **cash from the counter drawer** or **UPI to a shared
   family VPA** (`payment_mode`).
3. **Proof of uplift**: every `direct_sales` row stores
   `gross_amount` (official), the middleman counterfactual, and
   `middleman_uplift` — the extra rupees the picker earned by skipping the
   middleman. Counter ledgers aggregate this into an
   *anti-middleman impact* total (`GET /api/v1/municipal/centers/:id/sales`).

### Why this is "rectification" and not charity

The rate card is public (`GET /api/v1/municipal/rates`) and shared with Tier 1
and the B2B marketplace, so:

- the same ₹/kg anchors the IVR estimate, the counter payout, and the auction
  floor price — one price for the whole city;
- `middleman_rate_per_kg` records the informal-market counterfactual, so the
  income uplift claim is measurable per sale, not rhetorical.

---

## Database additions (`db/schema.sql`)

| Table | Purpose |
| :--- | :--- |
| `picker_profiles` | Tier registry (`IVR` / `OFFLINE`), language pref, card code, home ward, route notes |
| `ivr_sessions` | Per-call state machine + audit trail (language, state, digits, created listing) |
| `material_rates` | Official rate card with middleman counterfactual per material |
| `municipal_centers` | Direct-sale counters (ward, geo, manager, active flag) |
| `direct_sales` | Tier-2 walk-in sale ledger with rate snapshots, uplift, and payment outcome |

## API Summary

### Tier 1 — `/api/v1/ivr` (TwiML webhooks)

| Endpoint | Role |
| :--- | :--- |
| `POST /voice` | Call entry; bilingual "press 1 / press 2" language gather |
| `POST /language` | Language keypress → main menu |
| `POST /menu` | Menu dispatch (1 collection, 2 rates, 3 earnings, 0 repeat) |
| `POST /collection/material` | Material code 1–8 |
| `POST /collection/weight` | Weight entry (`12*5#` = 12.5 kg), official-rate estimate |
| `POST /collection/confirm` | 1 → listing created at rate floor; 2 → re-enter |

### Tier 2 — `/api/v1/municipal`

| Endpoint | Auth | Role |
| :--- | :--- | :--- |
| `GET /centers` | public | Find a direct-sale counter |
| `GET /rates` | public | Official rate card + middleman uplift % |
| `POST /centers` | ULB | Open a counter |
| `POST /pickers/offline` | ULB/DWCC | Register phone-less picker, issue card |
| `GET /pickers/offline` | ULB/DWCC | Registry with lifetime totals |
| `POST /centers/:id/sales` | ULB/DWCC | Record a walk-in direct sale (cash/UPI) |
| `GET /centers/:id/sales` | ULB/DWCC | Counter ledger + anti-middleman impact |

## Testing

`test/tier_system.test.js` (36 tests) covers:

- DTMF weight parsing, money rounding, XML escaping, TTS language mapping,
  full English/Hindi prompt parity, material-code table integrity;
- the complete Tier-1 call: language selection both ways, rates playback,
  earnings playback, unregistered-caller handling, and the full
  material → weight → confirm → listing path;
- the Tier-2 desk: card issuance format, synthetic no-phone identifiers,
  cash and UPI settlements with uplift math (e.g. PET 12.5 kg → ₹350 paid,
  ₹225 middleman counterfactual, ₹125 uplift), all validation and authz paths,
  and ledger aggregates.

The suite runs entirely without PostgreSQL by routing `pool.query` through an
in-memory fake that answers the exact SQL the controllers issue — matching the
repo convention of DB-free `npm test` runs.
