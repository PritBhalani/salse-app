import express from 'express';
import {
  checkInVisit,
  getVisits,
} from '../controllers/visitController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('ADMIN', 'WAREHOUSE'), getVisits);

router.post('/check-in', protect, authorize('SALESMAN'), checkInVisit);

export default router;
