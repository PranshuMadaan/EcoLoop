import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected Session Endpoint
router.get('/me', authenticate, getMe);

export default router;
