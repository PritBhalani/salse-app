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
  assignedSalesmen: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastVisitedAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// High-speed territory, salesman assignment and phone lookup indexes
shopSchema.index({ routeId: 1, isActive: 1 });
shopSchema.index({ phone: 1 });
shopSchema.index({ city: 1, isActive: 1 });
shopSchema.index(
  { shopName: 'text', ownerName: 'text', city: 'text' },
  { weights: { shopName: 10, ownerName: 5, city: 3 }, name: 'ShopTextIndex' }
);
shopSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
shopSchema.index({ createdAt: -1 });

export const Shop = process.env.MONGODB_URI
  ? (mongoose.models.Shop || mongoose.model('Shop', shopSchema))
  : createModelAdapter('shops');
