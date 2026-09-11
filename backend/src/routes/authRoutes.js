import express from 'express';
import {
  loginUser,
  createUser,
  getMe,
  getUsers,
  resetDevice,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('ADMIN', 'WAREHOUSE'), getUsers);
router.post('/users', protect, authorize('ADMIN'), createUser);
router.put('/users/:id/reset-device', protect, authorize('ADMIN'), resetDevice);

export default router;
