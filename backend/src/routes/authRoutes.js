import express from 'express';
import {
  loginUser,
  switchRole,
  createUser,
  getMe,
  getUsers,
  resetDevice,
  updateUser,
  deleteUser,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/switch-role', switchRole);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('ADMIN', 'WAREHOUSE'), getUsers);
router.post('/users', protect, authorize('ADMIN'), createUser);
router.put('/users/:id', protect, authorize('ADMIN'), updateUser);
router.delete('/users/:id', protect, authorize('ADMIN', 'WAREHOUSE'), deleteUser);
router.put('/users/:id/reset-device', protect, authorize('ADMIN'), resetDevice);

export default router;
