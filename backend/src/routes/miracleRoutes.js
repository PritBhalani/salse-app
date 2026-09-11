import express from 'express';
import {
  exportSalesToMiracle,
  exportReceiptsToMiracle,
} from '../controllers/miracleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/export-sales', protect, authorize('ADMIN', 'WAREHOUSE'), exportSalesToMiracle);
router.get('/export-receipts', protect, authorize('ADMIN', 'WAREHOUSE'), exportReceiptsToMiracle);

export default router;
