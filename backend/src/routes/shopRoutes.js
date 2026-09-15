import express from 'express';
import {
  getShops,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
  updateSalesmanAssignment,
} from '../controllers/shopController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getShops)
  .post(protect, authorize('ADMIN', 'SALESMAN', 'WAREHOUSE'), createShop);

router
  .route('/:id')
  .get(protect, getShopById)
  .put(protect, authorize('ADMIN', 'WAREHOUSE', 'SALESMAN'), updateShop)
  .delete(protect, authorize('ADMIN', 'WAREHOUSE'), deleteShop);

router.patch('/:id/salesman-assignment', protect, authorize('ADMIN', 'WAREHOUSE'), updateSalesmanAssignment);

export default router;
