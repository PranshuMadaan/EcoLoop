import { Router } from 'express';
import {
  voiceEntry,
  selectLanguage,
  mainMenu,
  collectionMaterial,
  collectionWeight,
  collectionConfirm,
} from '../controllers/ivrController.js';

const router = Router();

// Express 4 does not forward async rejections to the error handler on its own,
// so every IVR handler is wrapped.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Tier-1 IVR webhooks (Twilio-compatible). These are called by the telephony
// gateway, not by browsers, so they are intentionally unauthenticated; in
// production, validate the provider's request signature (e.g. X-Twilio-Signature)
// at the gateway edge.

// Call entry: bilingual welcome + "Press 1 for English, press 2 for Hindi"
router.post('/voice', wrap(voiceEntry));

// Language keypress handler -> main menu
router.post('/language', wrap(selectLanguage));

// Main menu dispatch: 1 collection, 2 rates, 3 earnings, 0 repeat
router.post('/menu', wrap(mainMenu));

// Collection flow: material code -> weight -> confirm & list
router.post('/collection/material', wrap(collectionMaterial));
router.post('/collection/weight', wrap(collectionWeight));
router.post('/collection/confirm', wrap(collectionConfirm));

export default router;
