import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getSalesmanPortfolio,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Must be before /:id to avoid conflict
router.get('/salesman-portfolio/:salesmanId', protect, authorize('ADMIN', 'WAREHOUSE'), getSalesmanPortfolio);

router
  .route('/')
  .get(protect, getOrders)
  .post(protect, authorize('ADMIN', 'SALESMAN', 'SHOP_OWNER'), createOrder);

router
  .route('/:id')
  .get(protect, getOrderById);

router.patch('/:id/status', protect, authorize('ADMIN', 'WAREHOUSE'), updateOrderStatus);

export default router;
