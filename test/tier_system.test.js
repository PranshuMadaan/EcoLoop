import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { pool } from '../src/config/db.js';
import twiml, { parseWeightInput, round2 } from '../src/services/twiml.js';
import {
  IVR_MATERIAL_CODES,
  WELCOME_BILINGUAL,
  PROMPTS,
  promptsFor,
} from '../src/services/ivrPrompts.js';

// ============================================================================
// Fixed identities used across the fake database
// ============================================================================
const ULB_ID = 'aaaaaaa1-0000-0000-0000-000000000001';
const DWCC_ID = 'aaaaaaa2-0000-0000-0000-000000000002';
const PICKER_ID = 'aaaaaaa3-0000-0000-0000-000000000003'; // Tier-1 IVR picker (has phone)
const OFFLINE_ID = 'aaaaaaa4-0000-0000-0000-000000000004'; // Tier-2 offline picker (no phone)
const CENTER_ID = 'aaaaaaa5-0000-0000-0000-000000000005';
const INACTIVE_CENTER_ID = 'aaaaaaa6-0000-0000-0000-000000000006';

// ============================================================================
// In-memory fake pg pool: answers exactly the SQL the tier-system controllers
// issue, so the full HTTP flow is testable without a live PostgreSQL.
// ============================================================================
function createFakeDb() {
  const db = {
    users: [
      { user_id: ULB_ID, mobile_number: '+919900000001', role: 'ULB', upi_vpa: null, verification_status: 'VERIFIED', password_hash: 'x' },
      { user_id: DWCC_ID, mobile_number: '+919900000002', role: 'DWCC', upi_vpa: null, verification_status: 'VERIFIED', password_hash: 'x' },
      { user_id: PICKER_ID, mobile_number: '+919876543210', role: 'Picker', upi_vpa: 'ramesh.waste@upi', verification_status: 'VERIFIED', password_hash: 'x' },
      { user_id: OFFLINE_ID, mobile_number: 'OFF-70000000101', role: 'Picker', upi_vpa: null, verification_status: 'VERIFIED', password_hash: 'x' },
    ],
    picker_profiles: [
      { profile_id: 'bbbbbbb1-0000-0000-0000-000000000001', user_id: OFFLINE_ID, tier: 'OFFLINE', language_pref: 'hi', card_code: 'ECO-4F2A91', display_name: 'Bhagwan Das', home_ward: 'Ward 134 (Dabri)', route_notes: 'Dabri mor route', registered_by: DWCC_ID, registered_at: new Date().toISOString() },
    ],
    material_rates: [
      { material_grade: 'E-Waste', rate_per_kg: '65.00', middleman_rate_per_kg: '40.00', updated_at: new Date().toISOString() },
      { material_grade: 'Metal', rate_per_kg: '45.00', middleman_rate_per_kg: '32.00', updated_at: new Date().toISOString() },
      { material_grade: 'HDPE', rate_per_kg: '32.00', middleman_rate_per_kg: '22.00', updated_at: new Date().toISOString() },
      { material_grade: 'PP', rate_per_kg: '30.00', middleman_rate_per_kg: '20.00', updated_at: new Date().toISOString() },
      { material_grade: 'PET', rate_per_kg: '28.00', middleman_rate_per_kg: '18.00', updated_at: new Date().toISOString() },
      { material_grade: 'LDPE', rate_per_kg: '20.00', middleman_rate_per_kg: '12.00', updated_at: new Date().toISOString() },
      { material_grade: 'Paper', rate_per_kg: '14.00', middleman_rate_per_kg: '9.00', updated_at: new Date().toISOString() },
      { material_grade: 'Cardboard', rate_per_kg: '10.00', middleman_rate_per_kg: '6.00', updated_at: new Date().toISOString() },
    ],
    municipal_centers: [
      { center_id: CENTER_ID, center_name: 'MCD MRF — Direct Sale Counter', ward: 'Ward 39 (Dwarka)', address: 'Dwarka Sector 14', latitude: 28.5921, longitude: 77.046, managed_by: DWCC_ID, is_active: true, created_at: new Date().toISOString() },
      { center_id: INACTIVE_CENTER_ID, center_name: 'Old Okhla Counter', ward: 'Ward 41', address: null, latitude: null, longitude: null, managed_by: null, is_active: false, created_at: new Date().toISOString() },
    ],
    ivr_sessions: [],
    scrap_listings: [],
    payouts: [
      { seller_id: PICKER_ID, seller_net_amount: '606.00', status: 'SUCCESS' },
      { seller_id: PICKER_ID, seller_net_amount: '250.00', status: 'SUCCESS' },
    ],
    direct_sales: [],
  };

  const uuid = () => `test-${Math.random().toString(16).slice(2, 14)}-${Date.now().toString(16)}`;

  const handle = async (text, params = []) => {
    const sql = String(text).replace(/\s+/g, ' ').trim();

    // ---- auth middleware -------------------------------------------------
    if (sql.includes('FROM users WHERE user_id = $1')) {
      return { rows: db.users.filter((u) => u.user_id === params[0]) };
    }

    // ---- ivr sessions ----------------------------------------------------
    if (sql.startsWith('INSERT INTO ivr_sessions')) {
      const existing = db.ivr_sessions.find((s) => s.call_sid === params[0]);
      if (existing) return { rows: [existing] };
      const row = {
        session_id: uuid(),
        call_sid: params[0],
        caller_number: params[1],
        picker_user_id: params[2],
        language: null,
        state: 'LANGUAGE_SELECT',
        selected_material: null,
        entered_weight_kg: null,
        created_listing_id: null,
      };
      db.ivr_sessions.push(row);
      return { rows: [row] };
    }
    if (sql.startsWith('SELECT * FROM ivr_sessions WHERE call_sid')) {
      return { rows: db.ivr_sessions.filter((s) => s.call_sid === params[0]) };
    }
    if (sql.startsWith('UPDATE ivr_sessions')) {
      const session = db.ivr_sessions.find((s) => s.session_id === params[0]);
      assert.ok(session, 'fake pool: updating a session that does not exist');
      const sets = [...sql.matchAll(/([a-z_]+) = \$(\d+)/g)];
      for (const [, column, placeholder] of sets) {
        session[column] = params[Number(placeholder) - 1];
      }
      return { rows: [] };
    }

    // ---- caller -> picker resolution --------------------------------------
    if (sql.includes("role = 'Picker' AND RIGHT(mobile_number, 10) = $1")) {
      const rows = db.users.filter(
        (u) => u.role === 'Picker' && u.mobile_number.replace(/\D/g, '').slice(-10) === params[0]
      );
      return { rows: rows.slice(0, 1) };
    }

    // ---- rate card --------------------------------------------------------
    if (sql.startsWith('SELECT material_grade, rate_per_kg, middleman_rate_per_kg FROM material_rates ORDER BY')) {
      const rows = [...db.material_rates].sort((a, b) => Number(b.rate_per_kg) - Number(a.rate_per_kg));
      return { rows };
    }
    if (sql.startsWith('SELECT material_grade, rate_per_kg, middleman_rate_per_kg FROM material_rates WHERE material_grade')) {
      return { rows: db.material_rates.filter((r) => r.material_grade === params[0]) };
    }
    if (sql.startsWith('SELECT rate_per_kg, middleman_rate_per_kg FROM material_rates WHERE material_grade')) {
      return { rows: db.material_rates.filter((r) => r.material_grade === params[0]) };
    }
    if (sql.startsWith('SELECT rate_per_kg FROM material_rates WHERE material_grade')) {
      return { rows: db.material_rates.filter((r) => r.material_grade === params[0]) };
    }
    if (sql.startsWith('SELECT material_grade, rate_per_kg, middleman_rate_per_kg, updated_at FROM material_rates ORDER BY')) {
      const rows = [...db.material_rates].sort((a, b) => Number(b.rate_per_kg) - Number(a.rate_per_kg));
      return { rows };
    }

    // ---- collection confirm -> scrap listing ------------------------------
    if (sql.startsWith('INSERT INTO scrap_listings')) {
      const row = {
        listing_id: uuid(),
        seller_id: params[0],
        material_grade: params[1],
        weight_kg: params[2],
        min_price: params[3],
        status: 'OPEN',
        origin_location: 'Tier-1 IVR call-in',
      };
      db.scrap_listings.push(row);
      return { rows: [{ ...row, listing_code: row.listing_id }] };
    }

    // ---- earnings (both payout rails) --------------------------------------
    if (sql.includes('FROM payouts WHERE seller_id = $1')) {
      const rows = db.payouts.filter((p) => p.seller_id === params[0] && p.status === 'SUCCESS');
      return {
        rows: [{
          total: String(rows.reduce((sum, p) => sum + Number(p.seller_net_amount), 0)),
          payments: String(rows.length),
        }],
      };
    }
    if (sql.includes('FROM direct_sales') && sql.includes('picker_user_id = $1') && sql.includes('COALESCE(SUM(gross_amount)')) {
      const rows = db.direct_sales.filter(
        (s) => s.picker_user_id === params[0] && ['SUCCESS', 'CASH_DISPENSED'].includes(s.payment_status)
      );
      return {
        rows: [{
          total: String(rows.reduce((sum, s) => sum + Number(s.gross_amount), 0)),
          payments: String(rows.length),
        }],
      };
    }

    // ---- municipal centers --------------------------------------------------
    if (sql.startsWith('INSERT INTO municipal_centers')) {
      const row = {
        center_id: uuid(),
        center_name: params[0],
        ward: params[1],
        address: params[2],
        latitude: params[3],
        longitude: params[4],
        is_active: true,
        created_at: new Date().toISOString(),
      };
      db.municipal_centers.push(row);
      return { rows: [row] };
    }
    if (sql.startsWith('SELECT c.center_id')) {
      const rows = db.municipal_centers.map((c) => ({
        ...c,
        managed_by_name: (db.users.find((u) => u.user_id === c.managed_by) || {}).organization_name || null,
      }));
      return { rows };
    }
    if (sql.startsWith('SELECT center_id, center_name, is_active FROM municipal_centers WHERE center_id = $1')) {
      return { rows: db.municipal_centers.filter((c) => c.center_id === params[0]) };
    }

    // ---- offline picker registration ---------------------------------------
    if (sql.includes('AS mobile_taken')) {
      return {
        rows: [{
          mobile_taken: db.users.some((u) => u.mobile_number === params[0]),
          card_taken: db.picker_profiles.some((p) => p.card_code === params[1]),
        }],
      };
    }
    if (sql.startsWith("INSERT INTO users (role, mobile_number, password_hash, upi_vpa, verification_status) VALUES ('Picker'")) {
      const row = { user_id: uuid(), mobile_number: params[0], role: 'Picker', upi_vpa: params[2], verification_status: 'VERIFIED', password_hash: params[1] };
      db.users.push(row);
      return { rows: [row] };
    }
    if (sql.startsWith('INSERT INTO picker_profiles')) {
      const row = {
        profile_id: uuid(),
        user_id: params[0],
        tier: 'OFFLINE',
        language_pref: params[1],
        card_code: params[2],
        display_name: params[3],
        home_ward: params[4],
        route_notes: params[5],
        registered_by: params[6],
        registered_at: new Date().toISOString(),
      };
      db.picker_profiles.push(row);
      return { rows: [row] };
    }
    if (sql.includes('FROM picker_profiles p JOIN users u ON p.user_id = u.user_id') && sql.includes("p.tier = 'OFFLINE'")) {
      const rows = db.picker_profiles
        .filter((p) => p.tier === 'OFFLINE')
        .map((p) => {
          const sales = db.direct_sales.filter(
            (s) => s.picker_user_id === p.user_id && ['SUCCESS', 'CASH_DISPENSED'].includes(s.payment_status)
          );
          return {
            ...p,
            upi_vpa: (db.users.find((u) => u.user_id === p.user_id) || {}).upi_vpa || null,
            lifetime_kg: String(sales.reduce((s2, x) => s2 + Number(x.weight_kg), 0)),
            lifetime_paid: String(sales.reduce((s2, x) => s2 + Number(x.gross_amount), 0)),
            lifetime_middleman_uplift: String(sales.reduce((s2, x) => s2 + Number(x.middleman_uplift), 0)),
          };
        });
      return { rows };
    }
    if (sql.startsWith('SELECT p.user_id, p.display_name, p.tier, u.upi_vpa FROM picker_profiles p')) {
      const profile = db.picker_profiles.find((p) => p.card_code === params[0]);
      if (!profile) return { rows: [] };
      const user = db.users.find((u) => u.user_id === profile.user_id);
      return { rows: [{ user_id: profile.user_id, display_name: profile.display_name, tier: profile.tier, upi_vpa: user ? user.upi_vpa : null }] };
    }

    // ---- direct sales --------------------------------------------------------
    if (sql.startsWith('INSERT INTO direct_sales')) {
      const row = {
        sale_id: uuid(),
        center_id: params[0],
        picker_user_id: params[1],
        material_grade: params[2],
        weight_kg: params[3],
        rate_per_kg: params[4],
        middleman_rate_per_kg: params[5],
        gross_amount: params[6],
        middleman_uplift: params[7],
        payment_mode: params[8],
        payment_status: params[9],
        gateway_transaction_id: params[10],
        recorded_by: params[11],
        created_at: new Date().toISOString(),
      };
      db.direct_sales.push(row);
      return { rows: [row] };
    }
    if (sql.startsWith('SELECT s.sale_id')) {
      const rows = db.direct_sales
        .filter((s) => s.center_id === params[0])
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((s) => ({
          ...s,
          picker_name: (db.picker_profiles.find((p) => p.user_id === s.picker_user_id) || {}).display_name,
          picker_card_code: (db.picker_profiles.find((p) => p.user_id === s.picker_user_id) || {}).card_code,
        }));
      return { rows };
    }
    if (sql.includes('SELECT COUNT(*) AS sale_count')) {
      const rows = db.direct_sales.filter(
        (s) => s.center_id === params[0] && ['SUCCESS', 'CASH_DISPENSED'].includes(s.payment_status)
      );
      return {
        rows: [{
          sale_count: String(rows.length),
          total_kg: String(rows.reduce((s, x) => s + Number(x.weight_kg), 0)),
          total_paid: String(rows.reduce((s, x) => s + Number(x.gross_amount), 0)),
          total_uplift: String(rows.reduce((s, x) => s + Number(x.middleman_uplift), 0)),
        }],
      };
    }

    throw new Error(`fake pool: unhandled SQL -> ${sql}`);
  };

  return { db, handle };
}

// ============================================================================
describe('2-Tier Picker System (Tier-1 IVR + Tier-2 Municipal Direct Sales)', () => {
  let server;
  let baseUrl;
  let fakeDb;
  const originalQuery = pool.query;

  before(async () => {
    fakeDb = createFakeDb();
    pool.query = fakeDb.handle; // route all SQL through the in-memory fake

    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    pool.query = originalQuery;
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  // --------------------------------------------------------------------------
  // HTTP helpers
  // --------------------------------------------------------------------------
  async function ivrPost(endpoint, form) {
    const res = await fetch(`${baseUrl}/api/v1/ivr${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
    return { status: res.status, contentType: res.headers.get('content-type'), xml: await res.text() };
  }

  async function apiRequest(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(`${baseUrl}/api/v1${endpoint}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  const JWT_SECRET = () => process.env.JWT_SECRET || 'ecoloop_default_dev_jwt_secret_key';
  const authCookie = (userId) => `token=${jwt.sign({ user_id: userId, role: 'ULB' }, JWT_SECRET(), { expiresIn: '1h' })}`;

  // ==========================================================================
  // 1. Pure unit tests (no DB): TwiML builder + bilingual prompt library
  // ==========================================================================
  describe('Unit: TwiML builder and bilingual prompts', () => {
    it('parses DTMF weight entries incl. star-as-decimal and hash terminator', () => {
      assert.equal(parseWeightInput('12'), 12);
      assert.equal(parseWeightInput('12#'), 12);
      assert.equal(parseWeightInput('12*5'), 12.5);
      assert.equal(parseWeightInput('12*5#'), 12.5);
      assert.equal(parseWeightInput('0'), null);
      assert.equal(parseWeightInput(''), null);
      assert.equal(parseWeightInput(undefined), null);
      assert.equal(parseWeightInput('abc'), null);
      assert.equal(parseWeightInput('5001'), null); // sanity cap
    });

    it('rounds money to 2 decimals without float drift', () => {
      assert.equal(round2(0.1 + 0.2), 0.3);
      assert.equal(round2(12.5 * 28), 350);
    });

    it('escapes XML special characters in Say text', () => {
      assert.ok(twiml.say('a & b <c> "d"', 'en').includes('a &amp; b &lt;c&gt; &quot;d&quot;'));
    });

    it('maps language codes to Indian TTS voices (en-IN / hi-IN)', () => {
      assert.ok(twiml.say('hello', 'en').includes('language="en-IN"'));
      assert.ok(twiml.say('नमस्ते', 'hi').includes('language="hi-IN"'));
    });

    it('exposes the press-1-English / press-2-Hindi welcome in both languages', () => {
      assert.match(WELCOME_BILINGUAL.en, /press 1/i);
      assert.match(WELCOME_BILINGUAL.hi, /हिंदी.*2 दबाइए/);
    });

    it('keeps full prompt parity between English and Hindi', () => {
      const enKeys = Object.keys(PROMPTS.en);
      const hiKeys = Object.keys(PROMPTS.hi);
      assert.deepEqual(enKeys.sort(), hiKeys.sort());
      for (const key of enKeys) {
        assert.equal(typeof PROMPTS.en[key], typeof PROMPTS.hi[key], `prompt '${key}' missing in one language`);
      }
    });

    it('maps all 8 DTMF material codes to valid marketplace grades', () => {
      assert.equal(Object.keys(IVR_MATERIAL_CODES).length, 8);
      for (const grade of Object.values(IVR_MATERIAL_CODES)) {
        assert.ok(['PET', 'HDPE', 'LDPE', 'PP', 'E-Waste', 'Paper', 'Cardboard', 'Metal'].includes(grade));
      }
    });
  });

  // ==========================================================================
  // 2. Tier 1 — IVR voice flow (pickers WITH a phone)
  // ==========================================================================
  describe('Tier 1: IVR voice flow', () => {
    const registeredFrom = '+919876543210'; // Ramesh (Tier-1 picker)
    const unknownFrom = '+919000000009';

    it('call entry greets bilingually and gathers 1 digit for language', async () => {
      const res = await ivrPost('/voice', { CallSid: 'CALL-100', From: registeredFrom });
      assert.equal(res.status, 200);
      assert.match(res.contentType, /text\/xml/);
      assert.match(res.xml, /For English, press 1/);
      assert.match(res.xml, /हिंदी के लिए 2 दबाइए/);
      assert.match(res.xml, /action="\/api\/v1\/ivr\/language"/);
      assert.match(res.xml, /numDigits="1"/);
      // Session persisted and linked to the registered picker
      const session = fakeDb.db.ivr_sessions.find((s) => s.call_sid === 'CALL-100');
      assert.ok(session);
      assert.equal(session.picker_user_id, PICKER_ID);
    });

    it('press 1 selects English and speaks the English main menu', async () => {
      const res = await ivrPost('/language', { CallSid: 'CALL-100', From: registeredFrom, Digits: '1' });
      assert.equal(res.status, 200);
      assert.match(res.xml, /Main menu\. Press 1 to report your collection/);
      assert.match(res.xml, /action="\/api\/v1\/ivr\/menu"/);
      assert.equal(fakeDb.db.ivr_sessions.find((s) => s.call_sid === 'CALL-100').language, 'en');
    });

    it('press 2 selects Hindi and speaks the Hindi main menu (Devanagari)', async () => {
      const res = await ivrPost('/language', { CallSid: 'CALL-200', From: registeredFrom, Digits: '2' });
      assert.equal(res.status, 200);
      assert.match(res.xml, /मुख्य मेनू/);
      assert.match(res.xml, /दर्ज करने के लिए 1 दबाइए/);
      assert.equal(fakeDb.db.ivr_sessions.find((s) => s.call_sid === 'CALL-200').language, 'hi');
    });

    it('an invalid language key re-prompts bilingually', async () => {
      const res = await ivrPost('/language', { CallSid: 'CALL-201', From: registeredFrom, Digits: '9' });
      assert.match(res.xml, /For English, press 1/);
      assert.match(res.xml, /हिंदी के लिए 2 दबाइए/);
    });

    it('menu key 2 reads official rates AND the middleman counterfactual (Hindi call)', async () => {
      const res = await ivrPost('/menu', { CallSid: 'CALL-200', From: registeredFrom, Digits: '2' });
      assert.match(res.xml, /आज के आधिकारिक EcoLoop दाम/);
      assert.match(res.xml, /65 रुपये/); // E-Waste official rate
      assert.match(res.xml, /बिचौलिया सिर्फ़ 40 रुपये देता है/); // middleman rate called out
    });

    it('menu key 3 reads lifetime earnings across both payout rails', async () => {
      const res = await ivrPost('/menu', { CallSid: 'CALL-100', From: registeredFrom, Digits: '3' });
      assert.match(res.xml, /856 rupees/); // 606 + 250 seeded payouts
      assert.match(res.xml, /from 2 payments/);
    });

    it('menu key 3 with no Digits (redirected) replays the menu instead of failing', async () => {
      const res = await ivrPost('/menu', { CallSid: 'CALL-100', From: registeredFrom });
      assert.equal(res.status, 200);
      assert.match(res.xml, /Main menu/);
    });

    it('unregistered callers are politely refused from collection reporting', async () => {
      await ivrPost('/voice', { CallSid: 'CALL-300', From: unknownFrom });
      await ivrPost('/language', { CallSid: 'CALL-300', From: unknownFrom, Digits: '1' });
      const res = await ivrPost('/menu', { CallSid: 'CALL-300', From: unknownFrom, Digits: '1' });
      assert.match(res.xml, /not registered with EcoLoop/);
      assert.match(res.xml, /<Hangup\/>/);
    });

    it('full happy path: material 1 (PET) -> weight 12*5# -> estimate at official rate -> confirm lists it', async () => {
      // drive CALL-100 (English, registered) into the collection flow
      const menuRes = await ivrPost('/menu', { CallSid: 'CALL-100', From: registeredFrom, Digits: '1' });
      assert.match(menuRes.xml, /Choose the material you collected/);
      assert.match(menuRes.xml, /Press 1 for PET plastic bottles/);

      // valid material key 1 -> PET selected, call moves on to the weight step
      const materialRes = await ivrPost('/collection/material', { CallSid: 'CALL-100', From: registeredFrom, Digits: '1' });
      assert.match(materialRes.xml, /enter the weight in kilograms/);
      assert.match(materialRes.xml, /finishOnKey="#"/);
      assert.equal(fakeDb.db.ivr_sessions.find((s) => s.call_sid === 'CALL-100').selected_material, 'PET');

      const weightRes = await ivrPost('/collection/weight', { CallSid: 'CALL-100', From: registeredFrom, Digits: '12*5#' });
      assert.match(weightRes.xml, /You entered 12\.5 kilos of PET plastic bottles/);
      assert.match(weightRes.xml, /Official rate, 28 rupees per kilo/);
      assert.match(weightRes.xml, /Estimated payment, 350 rupees/);
      assert.match(weightRes.xml, /Press 1 to confirm/);

      const confirmRes = await ivrPost('/collection/confirm', { CallSid: 'CALL-100', From: registeredFrom, Digits: '1' });
      assert.match(confirmRes.xml, /Confirmed\. Your collection is listed on the EcoLoop marketplace/);
      assert.match(confirmRes.xml, /<Redirect method="POST">\/api\/v1\/ivr\/menu<\/Redirect>/);

      // The listing was created at the official-rate floor price
      const listing = fakeDb.db.scrap_listings.find((l) => l.seller_id === PICKER_ID);
      assert.ok(listing, 'listing row created');
      assert.equal(listing.material_grade, 'PET');
      assert.equal(Number(listing.weight_kg), 12.5);
      assert.equal(Number(listing.min_price), 350);
      assert.equal(listing.status, 'OPEN');
      assert.equal(listing.origin_location, 'Tier-1 IVR call-in');

      const session = fakeDb.db.ivr_sessions.find((s) => s.call_sid === 'CALL-100');
      assert.equal(session.state, 'DONE');
      assert.equal(session.created_listing_id, listing.listing_id);
    });

    it('rejects an invalid material key with a re-prompt', async () => {
      const res = await ivrPost('/collection/material', { CallSid: 'CALL-100', From: registeredFrom, Digits: '0' });
      assert.match(res.xml, /that material key is not valid/);
      assert.match(res.xml, /Press 1 for PET plastic bottles/);
    });

    it('rejects a nonsense weight entry with a re-prompt', async () => {
      const res = await ivrPost('/collection/weight', { CallSid: 'CALL-100', From: registeredFrom, Digits: '99#99#' });
      assert.match(res.xml, /could not understand the weight/);
    });

    it('press 2 at confirmation restarts material entry', async () => {
      await ivrPost('/menu', { CallSid: 'CALL-100', From: registeredFrom, Digits: '1' });
      await ivrPost('/collection/material', { CallSid: 'CALL-100', From: registeredFrom, Digits: '3' });
      await ivrPost('/collection/weight', { CallSid: 'CALL-100', From: registeredFrom, Digits: '40' });
      const res = await ivrPost('/collection/confirm', { CallSid: 'CALL-100', From: registeredFrom, Digits: '2' });
      assert.match(res.xml, /Choose the material you collected/);
      const session = fakeDb.db.ivr_sessions.find((s) => s.call_sid === 'CALL-100');
      assert.equal(session.selected_material, null);
    });
  });

  // ==========================================================================
  // 3. Tier 2 — municipal direct sales (pickers WITHOUT a phone)
  // ==========================================================================
  describe('Tier 2: municipal counters, offline picker cards, direct sales', () => {
    it('public rate card exposes official vs middleman rates with uplift math', async () => {
      const res = await apiRequest('/municipal/rates');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.total, 8);
      const pet = res.body.data.rates.find((r) => r.material_grade === 'PET');
      assert.equal(pet.rate_per_kg, 28);
      assert.equal(pet.middleman_rate_per_kg, 18);
      assert.equal(pet.uplift_per_kg, 10);
      assert.equal(pet.uplift_pct, 55.56);
    });

    it('public center directory lists direct-sale counters', async () => {
      const res = await apiRequest('/municipal/centers');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.total >= 2);
      assert.ok(res.body.data.centers.some((c) => c.center_name.includes('MCD MRF')));
    });

    it('offline picker registration requires authentication', async () => {
      const res = await apiRequest('/municipal/pickers/offline', {
        method: 'POST',
        body: { display_name: 'No Auth' },
      });
      assert.equal(res.status, 401);
    });

    it('forbids non-municipal roles from registering offline pickers', async () => {
      const res = await apiRequest('/municipal/pickers/offline', {
        method: 'POST',
        headers: { Cookie: authCookie(PICKER_ID) },
        body: { display_name: 'Peer Picker' },
      });
      assert.equal(res.status, 403);
    });

    it('ULB registers an offline picker and issues a physical card code (no phone needed)', async () => {
      const res = await apiRequest('/municipal/pickers/offline', {
        method: 'POST',
        headers: { Cookie: authCookie(ULB_ID) },
        body: {
          display_name: 'Kamla Devi',
          home_ward: 'Ward 134 (Dabri)',
          route_notes: 'Dabri mor → Sector 6 market line, morning shift',
          upi_vpa: 'kamla.family@ybl',
        },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.tier, 'OFFLINE');
      assert.match(res.body.data.card_code, /^ECO-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
      assert.match(res.body.data.qr_payload, /^ECOLOOP:CARD:ECO-/);
      // synthetic non-dialable identifier used because the picker has no phone
      const createdUser = fakeDb.db.users.find((u) => u.user_id === res.body.data.user_id);
      assert.match(createdUser.mobile_number, /^OFF-\d{11}$/);
      assert.equal(createdUser.role, 'Picker');
      assert.equal(createdUser.upi_vpa, 'kamla.family@ybl');
    });

    it('rejects offline picker registration without a display name', async () => {
      const res = await apiRequest('/municipal/pickers/offline', {
        method: 'POST',
        headers: { Cookie: authCookie(ULB_ID) },
        body: { home_ward: 'Ward 134' },
      });
      assert.equal(res.status, 400);
    });

    it('records a CASH direct sale at official rates and proves the middleman uplift', async () => {
      const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(DWCC_ID) },
        body: { card_code: 'ECO-4F2A91', material_grade: 'PET', weight_kg: 12.5, payment_mode: 'CASH' },
      });
      assert.equal(res.status, 201);
      const { sale, picker, uplift_summary } = res.body.data;
      assert.equal(picker.display_name, 'Bhagwan Das');
      assert.equal(sale.material_grade, 'PET');
      assert.equal(Number(sale.weight_kg), 12.5);
      assert.equal(Number(sale.rate_per_kg), 28);
      assert.equal(Number(sale.gross_amount), 350);
      assert.equal(sale.payment_mode, 'CASH');
      assert.equal(sale.payment_status, 'CASH_DISPENSED');
      assert.equal(uplift_summary.official_paid, 350);
      assert.equal(uplift_summary.middleman_would_have_paid, 225);
      assert.equal(uplift_summary.extra_earned_by_picker, 125);
      assert.equal(uplift_summary.uplift_pct, 55.56);
    });

    it('defaults payment_mode to CASH when the counter omits it', async () => {
      const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(DWCC_ID) },
        body: { card_code: 'ECO-4F2A91', material_grade: 'HDPE', weight_kg: 8 },
      });
      assert.equal(res.status, 201);
      const { sale } = res.body.data;
      assert.equal(sale.payment_mode, 'CASH');
      assert.equal(sale.payment_status, 'CASH_DISPENSED');
      assert.equal(Number(sale.gross_amount), 256); // 8 kg x ₹32
    });

    it('UPI mode pays instantly to the picker VPA with a gateway reference', async () => {
      const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(DWCC_ID) },
        body: { card_code: 'ECO-4F2A91', material_grade: 'Metal', weight_kg: 10, payment_mode: 'UPI' },
      });
      assert.equal(res.status, 201);
      const { sale } = res.body.data;
      assert.equal(sale.payment_mode, 'UPI');
      assert.equal(sale.payment_status, 'SUCCESS');
      assert.match(sale.gateway_transaction_id, /^UPI-TXN-/);
      assert.equal(Number(sale.gross_amount), 450); // 10 kg x ₹45
      assert.equal(Number(sale.middleman_uplift), 130); // middleman would pay ₹320
    });

    it('rejects an unknown card code with 404', async () => {
      const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(DWCC_ID) },
        body: { card_code: 'ECO-000000', material_grade: 'PET', weight_kg: 5 },
      });
      assert.equal(res.status, 404);
      assert.match(res.body.error, /No picker card matches/);
    });

    it('rejects a material grade with no published official rate', async () => {
      const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(DWCC_ID) },
        body: { card_code: 'ECO-4F2A91', material_grade: 'Unobtainium', weight_kg: 5 },
      });
      assert.equal(res.status, 404);
      assert.match(res.body.error, /No official rate published/);
    });

    it('rejects non-positive or oversized weights', async () => {
      for (const badWeight of [0, -3, 'abc', 9999]) {
        const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
          method: 'POST',
          headers: { Cookie: authCookie(DWCC_ID) },
          body: { card_code: 'ECO-4F2A91', material_grade: 'PET', weight_kg: badWeight },
        });
        assert.equal(res.status, 400, `weight_kg=${badWeight} should fail`);
      }
    });

    it('refuses sales at an inactive counter', async () => {
      const res = await apiRequest(`/municipal/centers/${INACTIVE_CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(DWCC_ID) },
        body: { card_code: 'ECO-4F2A91', material_grade: 'PET', weight_kg: 5 },
      });
      assert.equal(res.status, 409);
    });

    it('requires authentication and a municipal role on the sale desk', async () => {
      const anon = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        body: { card_code: 'ECO-4F2A91', material_grade: 'PET', weight_kg: 5 },
      });
      assert.equal(anon.status, 401);

      const pickerCookie = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        method: 'POST',
        headers: { Cookie: authCookie(PICKER_ID) },
        body: { card_code: 'ECO-4F2A91', material_grade: 'PET', weight_kg: 5 },
      });
      assert.equal(pickerCookie.status, 403);
    });

    it('counter ledger totals the anti-middleman impact', async () => {
      const res = await apiRequest(`/municipal/centers/${CENTER_ID}/sales`, {
        headers: { Cookie: authCookie(DWCC_ID) },
      });
      assert.equal(res.status, 200);
      const { sales, impact } = res.body.data;
      assert.ok(sales.length >= 3);
      assert.equal(impact.sale_count, sales.length);
      // PET 12.5 (350/125) + HDPE 8 (256/80) + Metal 10 (450/130)
      assert.equal(impact.total_kg, 30.5);
      assert.equal(impact.total_paid_inr, 1056);
      assert.equal(impact.total_middleman_cut_avoided_inr, 335);
      // every ledger row identifies the card-carrying picker
      assert.ok(sales.every((s) => s.picker_card_code === 'ECO-4F2A91'));
    });

    it('offline picker registry shows lifetime totals', async () => {
      const res = await apiRequest('/municipal/pickers/offline', {
        headers: { Cookie: authCookie(ULB_ID) },
      });
      assert.equal(res.status, 200);
      const bhagwan = res.body.data.pickers.find((p) => p.card_code === 'ECO-4F2A91');
      assert.ok(bhagwan);
      assert.equal(bhagwan.display_name, 'Bhagwan Das');
      assert.equal(bhagwan.lifetime_kg, 30.5);
      assert.equal(bhagwan.lifetime_paid, 1056);
      assert.equal(bhagwan.lifetime_middleman_uplift, 335);
    });

    it('ULB can open a new direct-sale counter', async () => {
      const res = await apiRequest('/municipal/centers', {
        method: 'POST',
        headers: { Cookie: authCookie(ULB_ID) },
        body: {
          center_name: 'MCD Okhla MRF — Direct Sale Counter',
          ward: 'Ward 41 (Okhla)',
          address: 'Okhla Industrial Area Phase 1',
          latitude: 28.5423,
          longitude: 77.2789,
        },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.ward, 'Ward 41 (Okhla)');
      assert.equal(res.body.data.is_active, true);

      const listing = await apiRequest('/municipal/centers');
      assert.ok(listing.body.data.centers.some((c) => c.center_name.includes('Okhla')));
    });
  });
});
