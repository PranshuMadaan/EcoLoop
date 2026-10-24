/**
 * Minimal TwiML (Twilio Markup) builder for the Tier-1 IVR voice flow.
 * Produces XML strings that any Twilio-compatible telephony gateway can render.
 */

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * <Say> verb. Language is mapped to Indian TTS voices:
 *   en -> en-IN, hi -> hi-IN
 */
export const say = (text, language = 'en') =>
  `<Say language="${language === 'hi' ? 'hi-IN' : 'en-IN'}">${escapeXml(text)}</Say>`;

/**
 * <Gather> verb collecting DTMF digits and POSTing them to `action`.
 * @param {object} opts - { action, numDigits, finishOnKey, timeout }
 * @param {...string} children - Inner verbs (typically <Say> prompts)
 */
export const gather = (opts, ...children) => {
  const attributes = [`action="${escapeXml(opts.action)}"`, `method="POST"`];
  if (opts.numDigits) attributes.push(`numDigits="${opts.numDigits}"`);
  if (opts.finishOnKey) attributes.push(`finishOnKey="${escapeXml(opts.finishOnKey)}"`);
  if (opts.timeout) attributes.push(`timeout="${opts.timeout}"`);
  return `<Gather ${attributes.join(' ')}>${children.join('')}</Gather>`;
};

/** <Redirect> verb: continue the call at another webhook without digit input. */
export const redirect = (url) => `<Redirect method="POST">${escapeXml(url)}</Redirect>`;

/** <Hangup> verb: end the call politely. */
export const hangup = () => '<Hangup/>';

/** <Pause> verb: silence for `seconds`. */
export const pause = (seconds = 1) => `<Pause length="${seconds}"/>`;

/** Wrap verbs into a complete TwiML XML document. */
export const response = (...children) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response>${children.join('')}</Response>`;

/**
 * Round a number to 2 decimal places (money math for rate estimates).
 */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Parse a DTMF weight entry into kilograms.
 * Telephony keypads have no decimal point, so '*' is the decimal separator
 * (e.g. "12*5#" -> 12.5 kg). A trailing '#' terminator is accepted and stripped.
 * @returns {number|null} positive weight in kg, or null when unparseable
 */
export const parseWeightInput = (digits) => {
  if (digits === undefined || digits === null) return null;
  const cleaned = String(digits).replace(/#/g, '').replace(/\*/g, '.');
  if (!/^\d{0,6}(\.\d{0,3})?$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const weight = Number(cleaned);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 5000) return null;
  return round2(weight);
};

export default {
  say,
  gather,
  redirect,
  hangup,
  pause,
  response,
  round2,
  parseWeightInput,
  escapeXml,
};
