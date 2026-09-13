import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  basePrice: { type: Number, required: true, min: 0 },
  boxQuantity: { type: Number, default: 1 },
  stockQuantity: { type: Number, default: 0 },
  isOutOfStock: { type: Boolean, default: false },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  brand: { type: String, required: true, trim: true },
  uom: { type: String, default: 'Pcs' },
  boxQuantity: { type: Number, default: 1 },
  basePrice: { type: Number, required: true, min: 0 },
  gstPercentage: { type: Number, default: 18 },
  stockQuantity: { type: Number, default: 0 },
  isOutOfStock: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  hasVariants: { type: Boolean, default: false },
  variants: [variantSchema],
}, { timestamps: true });

export const Product = process.env.MONGODB_URI
  ? (mongoose.models.Product || mongoose.model('Product', productSchema))
  : createModelAdapter('products');
