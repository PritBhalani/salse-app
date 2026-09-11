import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    enum: [
      'Pipes & Fittings',
      'Brass C.P. Fittings',
      'Sanitaryware',
      'Bath Accessories',
      'Valves & Diverters',
      'Sinks & Drainage',
    ],
    default: 'Brass C.P. Fittings',
  },
  brand: { type: String, required: true, trim: true },
  uom: { type: String, enum: ['Pcs', 'Box', 'Bundle', 'Meter', 'Set'], default: 'Pcs' },
  boxQuantity: { type: Number, default: 1 },
  basePrice: { type: Number, required: true, min: 0 },
  gstPercentage: { type: Number, default: 18 },
  stockQuantity: { type: Number, default: 100 },
  isOutOfStock: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });

export const Product = process.env.MONGODB_URI
  ? (mongoose.models.Product || mongoose.model('Product', productSchema))
  : createModelAdapter('products');
