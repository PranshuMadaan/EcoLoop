import { query } from '../config/db.js';
import { say, gather, redirect, hangup, response, round2, parseWeightInput } from '../services/twiml.js';
import {
  IVR_MATERIAL_CODES,
  WELCOME_BILINGUAL,
  LANGUAGE_INVALID,
  promptsFor,
} from '../services/ivrPrompts.js';

/**
 * Tier 1 IVR Controller — voice-first intake for rag pickers WITH a phone.
 *
 * Twilio-compatible webhook endpoints. Every call is tracked in ivr_sessions
 * (state machine + audit trail). Call flow:
 *
 *   /voice            -> language select ("Press 1 for English, 2 for Hindi")
 *   /language         -> main menu gather (1 collection, 2 rates, 3 earnings)
 *   /menu             -> dispatch by key
 *   /collection/material -> DTMF material code (1-8)
 *   /collection/weight   -> DTMF weight in kg ("12*5#" = 12.5 kg)
 *   /collection/confirm  -> 1 confirms -> scrap listing created at official rate
 */

const BASE = '/api/v1/ivr';
const LANGUAGE_ACTION = `${BASE}/language`;
const MENU_ACTION = `${BASE}/menu`;
const MATERIAL_ACTION = `${BASE}/collection/material`;
const WEIGHT_ACTION = `${BASE}/collection/weight`;
const CONFIRM_ACTION = `${BASE}/collection/confirm`;

const sendTwiML = (res, xml) => res.status(200).type('text/xml').send(xml);

/** Normalize any caller number to its last 10 digits for user matching. */
export const normalizeCaller = (from) => {
  const digits = String(from || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/** Look up the registered Picker placing the call (matched on last 10 digits). */
export const resolvePicker = async (from) => {
  const normalized = normalizeCaller(from);
  if (!normalized) return null;
  const result = await query(
    `SELECT user_id, mobile_number, role, upi_vpa
     FROM users
     WHERE role = 'Picker' AND RIGHT(mobile_number, 10) = $1
     LIMIT 1;`,
    [normalized]
  );
  return result.rows[0] || null;
};

/** Insert or refresh the session row for a call and return it. */
export const upsertSession = async ({ callSid, callerNumber, pickerUserId = null }) => {
  const result = await query(
    `INSERT INTO ivr_sessions (call_sid, caller_number, picker_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (call_sid) DO UPDATE SET updated_at = NOW()
     RETURNING *;`,
    [callSid, callerNumber, pickerUserId]
  );
  return result.rows[0];
};

const findSession = async (callSid) => {
  if (!callSid) return null;
  const result = await query('SELECT * FROM ivr_sessions WHERE call_sid = $1;', [callSid]);
  return result.rows[0] || null;
};

/** Patch selected session fields (language, state, digits collected so far). */
const updateSession = async (sessionId, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const assignments = keys.map((k, i) => `${k} = $${i + 2}`);
  await query(
    `UPDATE ivr_sessions SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE session_id = $1;`,
    [sessionId, ...keys.map((k) => fields[k])]
  );
};

/** Ensure a session exists for this request (defensive against direct webhooks). */
const ensureSession = async (req) => {
  const callSid = req.body.CallSid || `WEB-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const callerNumber = req.body.From || 'unknown';
  const existing = await findSession(callSid);
  if (existing) return existing;
  const picker = await resolvePicker(callerNumber);
  return upsertSession({ callSid, callerNumber, pickerUserId: picker ? picker.user_id : null });
};

/**
 * POST /api/v1/ivr/voice
 * Call entry point: bilingual welcome + single-key language selection.
 */
export const voiceEntry = async (req, res) => {
  await ensureSession(req);
  const xml = response(
    say(WELCOME_BILINGUAL.en, 'en'),
    say(WELCOME_BILINGUAL.hi, 'hi'),
    gather({ action: LANGUAGE_ACTION, numDigits: 1, timeout: 6 })
  );
  return sendTwiML(res, xml);
};

/**
 * POST /api/v1/ivr/language
 * Handles the language keypress: 1 = English, 2 = Hindi. Anything else re-prompts.
 */
export const selectLanguage = async (req, res) => {
  const session = await ensureSession(req);
  const digits = req.body.Digits;
  let language = null;
  if (digits === '1') language = 'en';
  else if (digits === '2') language = 'hi';

  if (!language) {
    const xml = response(
      say(LANGUAGE_INVALID.en, 'en'),
      say(LANGUAGE_INVALID.hi, 'hi'),
      gather({ action: LANGUAGE_ACTION, numDigits: 1, timeout: 6 })
    );
    return sendTwiML(res, xml);
  }

  // Link the calling number to its registered picker profile (first call wins;
  // the session keeps picker_user_id null for unregistered callers).
  let pickerUserId = session.picker_user_id;
  if (!pickerUserId) {
    const picker = await resolvePicker(session.caller_number);
    if (picker) {
      pickerUserId = picker.user_id;
      await updateSession(session.session_id, { picker_user_id: pickerUserId });
    }
  }
  await updateSession(session.session_id, { language, state: 'MAIN_MENU' });

  const xml = response(
    say(promptsFor(language).menu, language),
    gather({ action: MENU_ACTION, numDigits: 1, timeout: 6 })
  );
  return sendTwiML(res, xml);
};

/** Menu prompt + gather verbs (nested inside other responses or served alone). */
const menuGatherBody = (language) => [
  say(promptsFor(language).menu, language),
  gather({ action: MENU_ACTION, numDigits: 1, timeout: 6 }),
];

/** Re-speak the main menu gather (shared by /menu default and invalid keys). */
const menuGatherXml = (language) => response(...menuGatherBody(language));

/** Fetch all official rates, ordered for spoken playback. */
const getRates = async () => {
  const result = await query(
    'SELECT material_grade, rate_per_kg, middleman_rate_per_kg FROM material_rates ORDER BY rate_per_kg DESC;'
  );
  return result.rows.map((r) => ({
    material_grade: r.material_grade,
    rate_per_kg: Number(r.rate_per_kg),
    middleman_rate_per_kg: Number(r.middleman_rate_per_kg),
  }));
};

/** Total money received by a picker across both payout rails. */
const getEarnings = async (pickerUserId) => {
  const payouts = await query(
    `SELECT COALESCE(SUM(seller_net_amount), 0) AS total, COUNT(*) AS payments
     FROM payouts WHERE seller_id = $1 AND status = 'SUCCESS';`,
    [pickerUserId]
  );
  const direct = await query(
    `SELECT COALESCE(SUM(gross_amount), 0) AS total, COUNT(*) AS payments
     FROM direct_sales
     WHERE picker_user_id = $1 AND payment_status IN ('SUCCESS', 'CASH_DISPENSED');`,
    [pickerUserId]
  );
  return {
    total: round2(Number(payouts.rows[0].total) + Number(direct.rows[0].total)),
    payments: Number(payouts.rows[0].payments) + Number(direct.rows[0].payments),
  };
};

/**
 * POST /api/v1/ivr/menu
 * Main menu dispatch: 1 report collection, 2 today's rates, 3 earnings, 0 repeat.
 * A request without Digits (e.g. arriving via <Redirect>) simply replays the menu.
 */
export const mainMenu = async (req, res) => {
  const session = await ensureSession(req);
  const language = session.language || 'en';
  const prompts = promptsFor(language);
  const digits = req.body.Digits;

  // No digit (redirected here) or explicit repeat key
  if (digits === undefined || digits === '' || digits === '0') {
    return sendTwiML(res, menuGatherXml(language));
  }

  // 1 -> collection flow (registered pickers only)
  if (digits === '1') {
    if (!session.picker_user_id) {
      const xml = response(say(prompts.notRegistered, language), hangup());
      await updateSession(session.session_id, { state: 'UNREGISTERED' });
      return sendTwiML(res, xml);
    }
    await updateSession(session.session_id, { state: 'COLLECT_MATERIAL' });
    const xml = response(
      say(prompts.materialMenu, language),
      gather({ action: MATERIAL_ACTION, numDigits: 1, timeout: 8 })
    );
    return sendTwiML(res, xml);
  }

  // 2 -> today's official rates (public info, works for unregistered callers too)
  if (digits === '2') {
    const rates = await getRates();
    const xml = response(
      say(prompts.ratesIntro, language),
      ...rates.map((r) => say(prompts.ratesLine(r.material_grade, r.rate_per_kg, r.middleman_rate_per_kg), language)),
      gather({ action: MENU_ACTION, numDigits: 1, timeout: 6 }, say(prompts.ratesOutro, language))
    );
    return sendTwiML(res, xml);
  }

  // 3 -> earnings summary (registered pickers; zero for others)
  if (digits === '3') {
    const lines = [say(prompts.earningsIntro, language)];
    if (session.picker_user_id) {
      const earnings = await getEarnings(session.picker_user_id);
      lines.push(
        say(
          earnings.payments > 0
            ? prompts.earningsTotal(earnings.total, earnings.payments)
            : prompts.earningsNone,
          language
        )
      );
    } else {
      lines.push(say(prompts.notRegistered, language), hangup());
      await updateSession(session.session_id, { state: 'UNREGISTERED' });
      return sendTwiML(res, response(...lines));
    }
    lines.push(gather({ action: MENU_ACTION, numDigits: 1, timeout: 6 }, say(prompts.earningsOutro, language)));
    return sendTwiML(res, response(...lines));
  }

  // Unknown key
  const xml = response(say(prompts.invalidKey, language), ...menuGatherBody(language));
  return sendTwiML(res, xml);
};

/**
 * POST /api/v1/ivr/collection/material
 * DTMF material code 1-8 -> stash grade, ask for weight.
 */
export const collectionMaterial = async (req, res) => {
  const session = await ensureSession(req);
  const language = session.language || 'en';
  const prompts = promptsFor(language);
  const grade = IVR_MATERIAL_CODES[req.body.Digits];

  if (!grade) {
    const xml = response(
      say(prompts.materialInvalid, language),
      say(prompts.materialMenu, language),
      gather({ action: MATERIAL_ACTION, numDigits: 1, timeout: 8 })
    );
    return sendTwiML(res, xml);
  }

  await updateSession(session.session_id, { state: 'COLLECT_WEIGHT', selected_material: grade });

  const xml = response(
    say(prompts.weightPrompt, language),
    gather({ action: WEIGHT_ACTION, finishOnKey: '#', timeout: 10 })
  );
  return sendTwiML(res, xml);
};

/**
 * POST /api/v1/ivr/collection/weight
 * Weight digits ("12" or "12*5") -> official-rate estimate -> confirm prompt.
 */
export const collectionWeight = async (req, res) => {
  const session = await ensureSession(req);
  const language = session.language || 'en';
  const prompts = promptsFor(language);
  const weightKg = parseWeightInput(req.body.Digits);
  const grade = session.selected_material;

  if (!weightKg || !grade) {
    const xml = response(
      say(prompts.weightInvalid, language),
      gather({ action: WEIGHT_ACTION, finishOnKey: '#', timeout: 10 })
    );
    return sendTwiML(res, xml);
  }

  const rateResult = await query(
    'SELECT rate_per_kg, middleman_rate_per_kg FROM material_rates WHERE material_grade = $1;',
    [grade]
  );
  if (rateResult.rows.length === 0) {
    // No official rate published for this grade yet — bounce to the menu
    const xml = response(say(prompts.invalidKey, language), menuGatherXml(language));
    return sendTwiML(res, xml);
  }
  const rate = Number(rateResult.rows[0].rate_per_kg);
  const estimate = round2(weightKg * rate);

  await updateSession(session.session_id, { state: 'CONFIRM', entered_weight_kg: weightKg });

  const xml = response(
    say(prompts.summaryConfirm(weightKg, grade, rate, estimate), language),
    gather({ action: CONFIRM_ACTION, numDigits: 1, timeout: 8 })
  );
  return sendTwiML(res, xml);
};

/**
 * POST /api/v1/ivr/collection/confirm
 * 1 -> create the scrap listing at the official-rate floor price.
 * 2 -> re-enter material. Anything else repeats the confirmation.
 */
export const collectionConfirm = async (req, res) => {
  const session = await ensureSession(req);
  const language = session.language || 'en';
  const prompts = promptsFor(language);
  const digits = req.body.Digits;

  if (digits === '2') {
    await updateSession(session.session_id, { state: 'COLLECT_MATERIAL', selected_material: null, entered_weight_kg: null });
    const xml = response(
      say(prompts.materialMenu, language),
      gather({ action: MATERIAL_ACTION, numDigits: 1, timeout: 8 })
    );
    return sendTwiML(res, xml);
  }

  if (digits !== '1' || !session.picker_user_id || !session.selected_material || !session.entered_weight_kg) {
    if (digits === '1' && !session.picker_user_id) {
      const xml = response(say(prompts.notRegistered, language), hangup());
      return sendTwiML(res, xml);
    }
    // Missing/unknown key — re-ask weight so the summary can be replayed
    const xml = response(
      say(prompts.weightPrompt, language),
      gather({ action: WEIGHT_ACTION, finishOnKey: '#', timeout: 10 })
    );
    return sendTwiML(res, xml);
  }

  const grade = session.selected_material;
  const weightKg = Number(session.entered_weight_kg);
  const rateResult = await query(
    'SELECT rate_per_kg FROM material_rates WHERE material_grade = $1;',
    [grade]
  );
  if (rateResult.rows.length === 0) {
    // Official rate was unpublished mid-call — bounce back to the menu
    const xml = response(say(prompts.invalidKey, language), ...menuGatherBody(language));
    return sendTwiML(res, xml);
  }
  const rate = Number(rateResult.rows[0].rate_per_kg);
  const minPrice = round2(weightKg * rate);

  const listingResult = await query(
    `INSERT INTO scrap_listings (seller_id, material_grade, weight_kg, min_price, status, origin_location)
     VALUES ($1, $2, $3, $4, 'OPEN', 'Tier-1 IVR call-in')
     RETURNING listing_id, listing_id::text AS listing_code, weight_kg, min_price;`,
    [session.picker_user_id, grade, weightKg.toFixed(2), minPrice.toFixed(2)]
  );
  const listing = listingResult.rows[0];

  await updateSession(session.session_id, { state: 'DONE', created_listing_id: listing.listing_id });

  // Short human-friendly reference for voice playback (first 8 hex chars)
  const listingCode = String(listing.listing_id).replace(/-/g, '').slice(0, 8).toUpperCase();

  const xml = response(
    say(prompts.confirmed(minPrice, listingCode), language),
    redirect(MENU_ACTION)
  );
  return sendTwiML(res, xml);
};

export default {
  voiceEntry,
  selectLanguage,
  mainMenu,
  collectionMaterial,
  collectionWeight,
  collectionConfirm,
  normalizeCaller,
};
