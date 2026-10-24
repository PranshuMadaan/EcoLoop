import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  verifyVpa,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public Authentication & UPI VPA Verification Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/verify-vpa', verifyVpa);

// Protected Session Endpoint
router.get('/me', authenticate, getMe);

export default router;
