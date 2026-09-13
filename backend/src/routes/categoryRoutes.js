import express from 'express';
import {
  getCategories,
  createCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getCategories)
  .post(protect, authorize('ADMIN', 'WAREHOUSE'), createCategory);

router
  .route('/:id')
  .delete(protect, authorize('ADMIN', 'WAREHOUSE'), deleteCategory);

export default router;
