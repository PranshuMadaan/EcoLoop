Complete the ledger system as a coherent simulated MVP (no real PSP integration — that stays deferred per docs/upi_onboarding_and_payout_architecture.md §7 "when triggered").

## Phase 1 — Fix what's broken (contracts + correctness)
1. Fix frontend↔backend field mismatches so the money UI works:
   - Settlement receipt modal (`frontend/src/main.js:398-464`): align with backend receipt keys (`gross_amount_inr`, `seller_net_amount_inr`, `platform_fee_inr`, `welfare_levy_inr`, `transaction_id`, `payee_vpa`) — or normalize the backend response to the friendlier names the UI already expects.
   - Escrow modal (`main.js:593-629`): send `bid_amount` (backend reads `req.body.bid_amount`), read `dynamic_qr_url` and `van_b2b_details.virtual_account_number`.
   - Penny-drop card (`main.js:513`): read `timestamp` or return `verified_at`.
2. Fix correctness bugs:
   - Sub-0.5 kg settlement failure: guard EPR weight so `verified_weight_mt > 0` (reject or floor) instead of permanent rollback.
   - Rounding drift: compute seller_net as `gross - platform_fee - welfare_levy` (residual method) so parts always sum to gross.
   - Rollback masking: wrap `client.query('ROLLBACK')` in try/catch in `acceptBid` and `placeBid` so the original error survives.
   - `verifyVpa` endpoint: persist result (`upi_vpa_status`, holder name, `upi_verified_at`) and change schema default to `'UNVERIFIED'` with the 3-value CHECK per doc §6.
   - Generate QR locally (e.g., `qrcode` npm) instead of leaking intent data to api.qrserver.com.

## Phase 2 — Open the ledger for reading
3. New payouts module: `src/controllers/payoutController.js` + `src/routes/payoutRoutes.js`, mounted at `/api/v1/payouts`:
   - `GET /payouts` — seller's own payout history (auth: Picker/DWCC/ULB sees own rows).
   - `GET /payouts/listing/:id` — payout for one listing (participants + ULB).
   - Admin/ULB audit list with `status` + date filters (add index on `payouts(status, created_at)`).
   - Use `authenticate` middleware; write tests using the existing DB-backed test convention (`node --test`).
4. Frontend ledger surface: "My Payouts" section/tab in `frontend/` consuming the new endpoints (table: date, lot, gross, net, fees, RRN, status).
5. Seed consistency: add payouts row(s) for settled Lot #4 matching its ACCEPTED bid; add `payouts` to the TRUNCATE list in `db/seed.sql:8`.

## Phase 3 — Close safety holes
6. Auth on money routes: `authenticate` + ownership/role checks on `accept-bid` (ULB owner of the listing only, via `authorizeRoles`) and `payment-intent` (Recycler).
7. Idempotency: add `UNIQUE` constraint preventing two payout rows per listing; pass/accept an idempotency key on accept-bid (per doc §3.1).
8. EPR integrity: recompute `generateCpcbHash` from listing data in the verify-by-hash endpoint instead of bare DB lookup; load `EPR_HASH_SECRET` with no committed fallback.

## Phase 4 — Funds-in lifecycle (simulated)
9. New `deposits` (escrow_in) table: persist payment intents (`PENDING`), add a confirm-deposit endpoint simulating the bank webhook that flips it to `SUCCESS`.
10. Gate settlement: `acceptBid` refuses to pay out unless a `SUCCESS` deposit exists for the winning bid amount; otherwise return 409.
11. Reversal path: endpoint + validation to mark a payout `REVERSED` (with compensating deposit row), making the schema's status lifecycle reachable.

Verification: run `npm test` (existing suites + new payouts tests); manual check of the three fixed modals against live backend responses; seed → initDb → exercise accept-bid → read payouts via new endpoint.

Explicitly NOT in scope (deferred per doc §7): real PSP/gateway sandbox integration, true penny-drop micro-deposits, WhatsApp/IVR payout notifications, camera QR capture, shared-custody printable voucher. Merging tier-system's direct_sales ledger / B2B bank-verification service is a separate merge task, not ported here.