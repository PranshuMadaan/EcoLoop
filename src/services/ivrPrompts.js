/**
 * Bilingual (English / हिंदी) voice prompt library for the Tier-1 IVR flow.
 *
 * Every prompt exists in both languages because the caller chooses a language
 * with the very first keypress: 1 = English, 2 = Hindi.
 */

// DTMF code -> material grade (must stay in sync with the audio material menu)
export const IVR_MATERIAL_CODES = {
  1: 'PET',
  2: 'HDPE',
  3: 'Metal',
  4: 'Paper',
  5: 'Cardboard',
  6: 'E-Waste',
  7: 'LDPE',
  8: 'PP',
};

export const MATERIAL_LABELS = {
  PET: { en: 'PET plastic bottles', hi: 'PET प्लास्टिक बोतलें' },
  HDPE: { en: 'hard plastic HDPE', hi: 'सख़्त प्लास्टिक HDPE' },
  LDPE: { en: 'soft plastic LDPE', hi: 'नरम प्लास्टिक LDPE' },
  PP: { en: 'PP plastic', hi: 'PP प्लास्टिक' },
  'E-Waste': { en: 'electronic waste', hi: 'इलेक्ट्रॉनिक कचरा' },
  Paper: { en: 'paper', hi: 'कागज़' },
  Cardboard: { en: 'cardboard', hi: 'गत्ता' },
  Metal: { en: 'metal', hi: 'धातु' },
};

export const materialLabel = (grade, language = 'en') => {
  const label = MATERIAL_LABELS[grade];
  if (!label) return grade;
  return language === 'hi' ? label.hi : label.en;
};

/** Format a rupee amount for TTS in the chosen language. */
export const money = (amount, language = 'en') => {
  const value = Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return language === 'hi' ? `${value} रुपये` : `${value} rupees`;
};

/**
 * Entry greeting played before a language is chosen, so it is bilingual
 * by design: English first, Hindi second, then a single-key choice.
 */
export const WELCOME_BILINGUAL = {
  en: 'Thank you for calling EcoLoop. For English, press 1.',
  hi: 'हिंदी के लिए 2 दबाइए।',
};

export const LANGUAGE_INVALID = {
  en: 'Sorry, that key is not valid. For English, press 1.',
  hi: 'क्षमा करें। हिंदी के लिए 2 दबाइए।',
};

export const PROMPTS = {
  en: {
    menu:
      'Main menu. Press 1 to report your collection. ' +
      'Press 2 for today\u2019s rates. Press 3 for your earnings. ' +
      'Press 0 to repeat this menu.',
    invalidKey: 'Sorry, that key is not valid.',
    notRegistered:
      'This mobile number is not registered with EcoLoop. ' +
      'Please visit your nearest municipal collection centre to register. Goodbye.',
    materialMenu:
      'Choose the material you collected. ' +
      'Press 1 for PET plastic bottles. Press 2 for hard plastic HDPE. ' +
      'Press 3 for metal. Press 4 for paper. Press 5 for cardboard. ' +
      'Press 6 for electronic waste. Press 7 for soft plastic LDPE. ' +
      'Press 8 for PP plastic.',
    materialInvalid: 'Sorry, that material key is not valid. Please choose again.',
    weightPrompt:
      'Now enter the weight in kilograms using the number keys, ' +
      'then press the hash key. For example, for twelve and a half kilos, ' +
      'press 1, 2, star, 5, hash.',
    weightInvalid:
      'We could not understand the weight. Please enter the weight in kilograms, ' +
      'then press the hash key.',
    summaryConfirm: (weightKg, grade, ratePerKg, estimatedAmount) =>
      `You entered ${weightKg} kilos of ${materialLabel(grade, 'en')}. ` +
      `Official rate, ${money(ratePerKg, 'en')} per kilo. ` +
      `Estimated payment, ${money(estimatedAmount, 'en')}. ` +
      'Press 1 to confirm. Press 2 to enter again.',
    confirmed: (estimatedAmount, listingCode) =>
      `Confirmed. Your collection is listed on the EcoLoop marketplace, ` +
      `reference ${listingCode}. Estimated payment, ${money(estimatedAmount, 'en')}. ` +
      'Recyclers will now bid, and your payment will be sent to your UPI. ' +
      'Thank you for keeping our city clean.',
    ratesIntro: 'Today\u2019s official EcoLoop rates, per kilo.',
    ratesLine: (grade, ratePerKg, middlemanRatePerKg) =>
      `${materialLabel(grade, 'en')}: ${money(ratePerKg, 'en')}. ` +
      `Middlemen pay only ${money(middlemanRatePerKg, 'en')}.`,
    ratesOutro: 'Press any key to return to the main menu.',
    earningsIntro: 'Your EcoLoop account.',
    earningsNone: 'You have received no payments yet.',
    earningsTotal: (totalAmount, paymentCount) =>
      `Your total EcoLoop earnings are ${money(totalAmount, 'en')}, ` +
      `from ${paymentCount} payment${Number(paymentCount) === 1 ? '' : 's'}.`,
    earningsOutro: 'Press any key to return to the main menu.',
    goodbye: 'Thank you for calling EcoLoop. Goodbye.',
  },
  hi: {
    menu:
      'मुख्य मेनू। अपना संग्रह दर्ज करने के लिए 1 दबाइए। ' +
      'आज के दाम जानने के लिए 2 दबाइए। अपनी कमाई जानने के लिए 3 दबाइए। ' +
      'मेनू दोहराने के लिए 0 दबाइए।',
    invalidKey: 'क्षमा करें, यह कुंजी मान्य नहीं है।',
    notRegistered:
      'यह मोबाइल नंबर EcoLoop में पंजीकृत नहीं है। ' +
      'कृपया पंजीकरण के लिए अपने नज़दीकी नगरपालिका केंद्र पर जाएँ। धन्यवाद।',
    materialMenu:
      'अपनी सामग्री चुनिए। ' +
      'PET प्लास्टिक बोतलों के लिए 1 दबाइए। सख़्त प्लास्टिक HDPE के लिए 2। ' +
      'धातु के लिए 3। कागज़ के लिए 4। गत्ते के लिए 5। ' +
      'इलेक्ट्रॉनिक कचरे के लिए 6। नरम प्लास्टिक LDPE के लिए 7। PP प्लास्टिक के लिए 8।',
    materialInvalid: 'क्षमा करें, यह कुंजी मान्य नहीं है। कृपया दोबारा चुनिए।',
    weightPrompt:
      'अब किलोग्राम में वज़न नंबर कुंजियों से डालिए, फिर हैश दबाइए। ' +
      'उदाहरण के लिए, बारह और आधा किलो के लिए 1, 2, स्टार, 5, हैश दबाइए।',
    weightInvalid:
      'वज़न समझ नहीं आया। कृपया किलोग्राम में वज़न डालिए, फिर हैश दबाइए।',
    summaryConfirm: (weightKg, grade, ratePerKg, estimatedAmount) =>
      `आपने ${materialLabel(grade, 'hi')} के ${weightKg} किलो दर्ज किए। ` +
      `आधिकारिक दर, ${money(ratePerKg, 'hi')} प्रति किलो। ` +
      `अनुमानित भुगतान, ${money(estimatedAmount, 'hi')}। ` +
      'पुष्टि के लिए 1 दबाइए। दोबारा डालने के लिए 2 दबाइए।',
    confirmed: (estimatedAmount, listingCode) =>
      `पुष्टि हो गई। आपका संग्रह EcoLoop मार्केटप्लेस पर दर्ज हो गया है, संदर्भ ${listingCode}। ` +
      `अनुमानित भुगतान, ${money(estimatedAmount, 'hi')}। ` +
      'रीसायकलर अब बोली लगाएँगे और भुगतान आपके UPI पर भेजा जाएगा। ' +
      'हमारा शहर साफ़ रखने के लिए धन्यवाद।',
    ratesIntro: 'आज के आधिकारिक EcoLoop दाम, प्रति किलो।',
    ratesLine: (grade, ratePerKg, middlemanRatePerKg) =>
      `${materialLabel(grade, 'hi')}: ${money(ratePerKg, 'hi')}। ` +
      `बिचौलिया सिर्फ़ ${money(middlemanRatePerKg, 'hi')} देता है।`,
    ratesOutro: 'मुख्य मेनू पर लौटने के लिए कोई भी कुंजी दबाइए।',
    earningsIntro: 'आपका EcoLoop खाता।',
    earningsNone: 'अभी तक आपको कोई भुगतान प्राप्त नहीं हुआ है।',
    earningsTotal: (totalAmount, paymentCount) =>
      `आपकी कुल EcoLoop कमाई ${money(totalAmount, 'hi')} है, ` +
      `${paymentCount} भुगतानों से।`,
    earningsOutro: 'मुख्य मेनू पर लौटने के लिए कोई भी कुंजी दबाइए।',
    goodbye: 'EcoLoop को कॉल करने के लिए धन्यवाद। अलविदा।',
  },
};

export const promptsFor = (language) => PROMPTS[language] || PROMPTS.en;

export default {
  IVR_MATERIAL_CODES,
  MATERIAL_LABELS,
  WELCOME_BILINGUAL,
  LANGUAGE_INVALID,
  PROMPTS,
  promptsFor,
  materialLabel,
  money,
};
