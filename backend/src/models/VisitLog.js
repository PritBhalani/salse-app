import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const visitLogSchema = new mongoose.Schema({
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  distanceMeters: { type: Number, required: true },
  isGeofenceVerified: { type: Boolean, default: false },
  isMockLocationDetected: { type: Boolean, default: false },
  photoProofUrl: { type: String, default: '' },
  purpose: {
    type: String,
    enum: ['ORDER_AND_COLLECTION', 'ORDER_ONLY', 'PAYMENT_COLLECTION', 'GENERAL_VISIT', 'SHOP_CLOSED'],
    default: 'ORDER_AND_COLLECTION',
  },
  notes: { type: String, default: '' },
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date },
}, { timestamps: true });

export const VisitLog = process.env.MONGODB_URI
  ? (mongoose.models.VisitLog || mongoose.model('VisitLog', visitLogSchema))
  : createModelAdapter('visitlogs');
