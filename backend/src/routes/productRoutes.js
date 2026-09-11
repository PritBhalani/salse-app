import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleStockStatus,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getProducts)
  .post(protect, authorize('ADMIN', 'WAREHOUSE'), createProduct);

router.patch('/:id/toggle-stock', protect, authorize('ADMIN', 'WAREHOUSE'), toggleStockStatus);

router
  .route('/:id')
  .get(protect, getProductById)
  .put(protect, authorize('ADMIN', 'WAREHOUSE'), updateProduct)
  .delete(protect, authorize('ADMIN', 'WAREHOUSE'), deleteProduct);

export default router;
