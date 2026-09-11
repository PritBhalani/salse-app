import express from 'express';
import {
  recordPayment,
  getPayments,
  settleSalesmanCash,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getPayments)
  .post(protect, authorize('ADMIN', 'SALESMAN'), recordPayment);

router.post('/settle-cash', protect, authorize('ADMIN', 'WAREHOUSE'), settleSalesmanCash);

export default router;
