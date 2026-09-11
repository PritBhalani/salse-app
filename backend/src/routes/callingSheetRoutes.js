import express from 'express';
import {
  getCallingSheet,
  logCallNote,
} from '../controllers/callingSheetController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('ADMIN', 'WAREHOUSE'), getCallingSheet);
router.post('/log-call', protect, authorize('ADMIN', 'WAREHOUSE'), logCallNote);

export default router;
