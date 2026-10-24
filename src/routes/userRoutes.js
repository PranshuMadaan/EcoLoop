import { Router } from 'express';
import {
  registerUser,
  getUserById,
  listUsers,
} from '../controllers/userController.js';

const router = Router();

// POST /api/v1/users -> Register user (role, mobile_number, upi_vpa)
router.post('/', registerUser);

// GET /api/v1/users -> List users filtered by role/status
router.get('/', listUsers);

// GET /api/v1/users/:id -> Fetch user profile by ID
router.get('/:id', getUserById);

export default router;
