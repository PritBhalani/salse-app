import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getOrders)
  .post(protect, authorize('ADMIN', 'SALESMAN'), createOrder);

router
  .route('/:id')
  .get(protect, getOrderById);

router.patch('/:id/status', protect, authorize('ADMIN', 'WAREHOUSE'), updateOrderStatus);

export default router;
