import crypto from 'crypto';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

// ============================================================================
// Simulated Voice-to-Text Parsing Engine
// Maps common regional voice phrases to structured material + weight JSON
// ============================================================================
const VOICE_PARSE_PATTERNS = [
  // Hindi patterns
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|केजी|किलो)\s*(pet|पीईटी|plastic|प्लास्टिक)/i, grade: 'PET_CLEAR', lang: 'hi' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|केजी|किलो)\s*(hdpe|एचडीपीई|drum|ड्रम)/i, grade: 'HDPE_RIGID', lang: 'hi' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|केजी|किलो)\s*(cardboard|गत्ता|paper|कागज)/i, grade: 'CORRUGATED_CARDBOARD', lang: 'hi' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|केजी|किलो)\s*(ldpe|film|फिल्म|polythene|पॉलिथीन)/i, grade: 'LDPE_FILM', lang: 'hi' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|केजी|किलो)\s*(metal|लोहा|iron|steel|स्टील)/i, grade: 'FERROUS_METAL', lang: 'hi' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|केजी|किलो)\s*(ewaste|e-waste|electronic|इलेक्ट्रॉनिक)/i, grade: 'E_WASTE_MIXED', lang: 'hi' },
  // Marathi patterns
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|किलो)\s*(बाटल्या|बाटली|pet)/i, grade: 'PET_CLEAR', lang: 'mr' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|किलो)\s*(पुठ्ठा|판지|cardboard)/i, grade: 'CORRUGATED_CARDBOARD', lang: 'mr' },
  // Kannada patterns
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|ಕೆಜಿ)\s*(ಪ್ಲಾಸ್ಟಿಕ್|pet|plastic)/i, grade: 'PET_CLEAR', lang: 'kn' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg|ಕೆಜಿ)\s*(ಕಾಗದ|paper|cardboard)/i, grade: 'CORRUGATED_CARDBOARD', lang: 'kn' },
  // English fallback patterns
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*(pet|PET)/i, grade: 'PET_CLEAR', lang: 'en' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*(hdpe|HDPE)/i, grade: 'HDPE_RIGID', lang: 'en' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*(cardboard|paper)/i, grade: 'CORRUGATED_CARDBOARD', lang: 'en' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*(ldpe|film|polythene)/i, grade: 'LDPE_FILM', lang: 'en' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*(metal|iron|steel)/i, grade: 'FERROUS_METAL', lang: 'en' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*(ewaste|e-waste|electronic)/i, grade: 'E_WASTE_MIXED', lang: 'en' },
];

// Simulated fair benchmark rates (INR per kg) by material grade
const BENCHMARK_RATES = {
  PET_CLEAR: 22.00,
  HDPE_RIGID: 18.50,
  CORRUGATED_CARDBOARD: 12.00,
  LDPE_FILM: 8.50,
  FERROUS_METAL: 32.00,
  E_WASTE_MIXED: 45.00,
  PP_WOVEN: 14.00,
  ALUMINIUM: 85.00,
  GLASS_CLEAR: 3.50,
};

// Multilingual WhatsApp reply templates
const REPLY_TEMPLATES = {
  hi: (name, grade, weight, rate, total, hub) =>
    `🟢 नमस्ते ${name}!\n\n` +
    `📦 सामग्री: ${grade}\n` +
    `⚖️ अनुमानित वज़न: ${weight} kg\n` +
    `💰 बेंचमार्क दर: ₹${rate}/kg\n` +
    `💵 अनुमानित कमाई: ₹${total}\n\n` +
    `📍 निकटतम DWCC हब: ${hub}\n` +
    `🕐 समय: सुबह 7 बजे – शाम 6 बजे\n\n` +
    `✅ अपना QR कोड DWCC काउंटर पर स्कैन करें।`,
  mr: (name, grade, weight, rate, total, hub) =>
    `🟢 नमस्कार ${name}!\n\n` +
    `📦 माल: ${grade}\n` +
    `⚖️ अंदाजे वजन: ${weight} kg\n` +
    `💰 बेंचमार्क दर: ₹${rate}/kg\n` +
    `💵 अंदाजे कमाई: ₹${total}\n\n` +
    `📍 जवळचे DWCC हब: ${hub}\n` +
    `🕐 वेळ: सकाळी 7 – संध्याकाळी 6\n\n` +
    `✅ तुमचा QR कोड DWCC काउंटरवर स्कॅन करा.`,
  kn: (name, grade, weight, rate, total, hub) =>
    `🟢 ನಮಸ್ಕಾರ ${name}!\n\n` +
    `📦 ವಸ್ತು: ${grade}\n` +
    `⚖️ ಅಂದಾಜು ತೂಕ: ${weight} kg\n` +
    `💰 ಬೆಂಚ್‌ಮಾರ್ಕ್ ದರ: ₹${rate}/kg\n` +
    `💵 ಅಂದಾಜು ಗಳಿಕೆ: ₹${total}\n\n` +
    `📍 ಹತ್ತಿರದ DWCC ಹಬ್: ${hub}\n` +
    `🕐 ಸಮಯ: ಬೆಳಗ್ಗೆ 7 – ಸಂಜೆ 6\n\n` +
    `✅ ನಿಮ್ಮ QR ಕೋಡ್ ಅನ್ನು DWCC ಕೌಂಟರ್‌ನಲ್ಲಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.`,
  en: (name, grade, weight, rate, total, hub) =>
    `🟢 Hello ${name}!\n\n` +
    `📦 Material: ${grade}\n` +
    `⚖️ Estimated Weight: ${weight} kg\n` +
    `💰 Benchmark Rate: ₹${rate}/kg\n` +
    `💵 Estimated Earnings: ₹${total}\n\n` +
    `📍 Nearest DWCC Hub: ${hub}\n` +
    `🕐 Hours: 7 AM – 6 PM\n\n` +
    `✅ Scan your QR code at the DWCC counter for instant payout.`,
};

// Simulated DWCC micro-hub locations
const DWCC_HUBS = [
  { name: 'SWaCH DWCC Kothrud, Pune', lat: 18.5074, lng: 73.8077 },
  { name: 'SWaCH DWCC Hadapsar, Pune', lat: 18.5089, lng: 73.9260 },
  { name: 'Hasiru Dala DWCC Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Hasiru Dala DWCC HSR Layout, Bengaluru', lat: 12.9116, lng: 77.6474 },
  { name: 'Chintan DWCC Shahdara, Delhi', lat: 28.6814, lng: 77.2945 },
  { name: 'Chintan DWCC Okhla, Delhi', lat: 28.5355, lng: 77.2744 },
];

/**
 * Simulate Speech-to-Text parsing of a regional voice note
 * @param {string} transcriptText - Raw simulated transcript
 * @returns {{ material_grade: string, estimated_weight_kg: number } | null}
 */
function parseVoiceTranscript(transcriptText) {
  for (const pattern of VOICE_PARSE_PATTERNS) {
    const match = transcriptText.match(pattern.regex);
    if (match) {
      return {
        material_grade: pattern.grade,
        estimated_weight_kg: parseFloat(match[1]),
        detected_language: pattern.lang,
      };
    }
  }
  return null;
}

/**
 * Multilingual WhatsApp Voice Webhook Parser
 * POST /api/v1/iwl/whatsapp/voice-webhook
 *
 * Receives a WhatsApp webhook payload with audio_url and from_mobile_number,
 * identifies the worker, simulates STT, calculates estimated earnings,
 * and returns a formatted multilingual reply.
 */
export const handleWhatsAppVoiceWebhook = async (req, res, next) => {
  try {
    const {
      audio_url,
      from_mobile_number,
      // Optional: pre-transcribed text for testing (bypasses real STT)
      simulated_transcript,
    } = req.body;

    // --- Validate required webhook fields ---
    if (!from_mobile_number || typeof from_mobile_number !== 'string') {
      throw new AppError('from_mobile_number is required in the webhook payload.', 400);
    }

    if (!audio_url && !simulated_transcript) {
      throw new AppError('Either audio_url or simulated_transcript is required.', 400);
    }

    // --- Step 1: Identify the worker from their mobile number ---
    const userRes = await query(
      `SELECT u.user_id, u.mobile_number, u.upi_vpa, u.organization_name,
              wp.worker_id, wp.full_name, wp.preferred_language, wp.cooperative_affiliation,
              wp.kyc_status, wp.qr_code_hash
       FROM users u
       LEFT JOIN worker_profiles wp ON u.user_id = wp.user_id
       WHERE u.mobile_number = $1;`,
      [from_mobile_number.trim()]
    );

    const isRegistered = userRes.rows.length > 0;
    const user = isRegistered ? userRes.rows[0] : null;
    const workerName = user ? (user.full_name || user.organization_name || 'Worker') : 'Saathi';
    const language = user?.preferred_language || 'hi';

    // --- Step 2: Simulate Speech-to-Text (STT) ---
    // In production, this would call Google Cloud Speech-to-Text or Whisper API
    // with language hints from the worker's preferred_language.
    const rawTranscript = simulated_transcript || `25 kilo PET plastic`;

    const sttResult = parseVoiceTranscript(rawTranscript);

    if (!sttResult) {
      // Could not parse — send a clarification request
      const clarificationTemplates = {
        hi: `⚠️ ${workerName}, हम आपकी आवाज़ समझ नहीं पाए। कृपया फिर से बोलें: "[वज़न] किलो [सामग्री]" (उदा: "25 किलो PET प्लास्टिक")`,
        mr: `⚠️ ${workerName}, आम्हाला तुमचा आवाज समजला नाही. कृपया पुन्हा बोला: "[वजन] किलो [माल]"`,
        kn: `⚠️ ${workerName}, ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಅರ್ಥೈಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.`,
        en: `⚠️ ${workerName}, we couldn't understand your voice note. Please say: "[weight] kilo [material]" (e.g., "25 kilo PET plastic")`,
      };

      return res.status(200).json({
        success: true,
        data: {
          webhook_status: 'PARSE_FAILED',
          from_mobile_number,
          worker: user.worker_id ? { worker_id: user.worker_id, full_name: workerName } : null,
          raw_transcript: rawTranscript,
          parsed_result: null,
          whatsapp_reply: clarificationTemplates[language] || clarificationTemplates.en,
        },
      });
    }

    const { material_grade, estimated_weight_kg } = sttResult;

    // --- Step 3: Lookup benchmark rate ---
    const benchmarkRate = BENCHMARK_RATES[material_grade] || 10.00;
    const estimatedTotal = parseFloat((estimated_weight_kg * benchmarkRate).toFixed(2));

    // --- Step 4: Find nearest DWCC hub (simulated) ---
    const nearestHub = DWCC_HUBS[Math.floor(Math.random() * DWCC_HUBS.length)];

    // --- Step 5: Format multilingual WhatsApp reply ---
    const templateFn = REPLY_TEMPLATES[language] || REPLY_TEMPLATES.en;
    const whatsappReply = templateFn(
      workerName,
      material_grade.replace(/_/g, ' '),
      estimated_weight_kg,
      benchmarkRate.toFixed(2),
      estimatedTotal.toLocaleString('en-IN'),
      nearestHub.name
    );

    // --- Step 6: Log webhook processing (audit trail) ---
    const webhookId = `wh_voice_${crypto.randomBytes(6).toString('hex')}`;

    return res.status(200).json({
      success: true,
      data: {
        webhook_id: webhookId,
        webhook_status: 'PARSED_OK',
        from_mobile_number,
        worker: {
          is_registered: isRegistered,
          worker_id: user?.worker_id || null,
          full_name: workerName,
          cooperative: user?.cooperative_affiliation || null,
          preferred_language: language,
          kyc_status: user?.kyc_status || 'UNREGISTERED',
        },
        stt_result: {
          raw_transcript: rawTranscript,
          material_grade,
          estimated_weight_kg,
          detected_language: sttResult.detected_language,
        },
        rate_lookup: {
          benchmark_rate_per_kg: benchmarkRate,
          estimated_total_inr: estimatedTotal,
          rate_source: 'EcoLoop Internal Benchmark (Oct 2026)',
        },
        nearest_dwcc_hub: nearestHub,
        whatsapp_reply: whatsappReply,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current benchmark scrap rates
 * GET /api/v1/iwl/rates
 */
export const getBenchmarkRates = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        rates: Object.entries(BENCHMARK_RATES).map(([grade, rate]) => ({
          material_grade: grade,
          rate_per_kg_inr: rate,
          display_name: grade.replace(/_/g, ' '),
        })),
        last_updated: '2026-10-24T00:00:00+05:30',
        source: 'EcoLoop Internal Benchmark',
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  handleWhatsAppVoiceWebhook,
  getBenchmarkRates,
};
