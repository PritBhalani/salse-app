import express from 'express';
import {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  getMyRoute,
} from '../controllers/routeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-route', protect, authorize('SALESMAN'), getMyRoute);

router
  .route('/')
  .get(protect, getRoutes)
  .post(protect, authorize('ADMIN', 'WAREHOUSE'), createRoute);

router
  .route('/:id')
  .get(protect, getRouteById)
  .put(protect, authorize('ADMIN', 'WAREHOUSE'), updateRoute)
  .delete(protect, authorize('ADMIN', 'WAREHOUSE'), deleteRoute);

export default router;
