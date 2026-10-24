import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  verifyVpa,
  verifyBankAccount,
  createRazorpayVerificationOrder,
  confirmRazorpayVerification,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public Authentication & Bank/UPI Verification Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/verify-vpa', verifyVpa);
router.post('/verify-bank-account', verifyBankAccount);
router.post('/razorpay/create-order', createRazorpayVerificationOrder);
router.post('/razorpay/confirm-payment', confirmRazorpayVerification);

// Protected Session Endpoint
router.get('/me', authenticate, getMe);

export default router;
