import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const shopSchema = new mongoose.Schema({
  shopName: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  altPhone: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  gstNumber: { type: String, trim: true },
  gstBalance: { type: Number, default: 0 },
  nonGstBalance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 150000 },
  qrCode: { type: String },
  photoUrl: { type: String },
  onboardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastVisitedAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Shop = process.env.MONGODB_URI
  ? (mongoose.models.Shop || mongoose.model('Shop', shopSchema))
  : createModelAdapter('shops');
