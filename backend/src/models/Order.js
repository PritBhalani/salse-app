import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  variantName: { type: String, default: '' },
  sku: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  boxCount: { type: Number, default: 0 },
  price: { type: Number, required: true },
  gstPercentage: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billType: { type: String, enum: ['GST', 'NON_GST'], required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  gstTotal: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },
  dispatchNotes: { type: String, default: '' },
  orderChannel: {
    type: String,
    enum: ['IN_PERSON_BEAT', 'PHONE_ORDER', 'DIRECT_REORDER'],
    default: 'IN_PERSON_BEAT',
  },
  isWithoutVisit: { type: Boolean, default: false },
  dispatchedAt: { type: Date },
  deliveredAt: { type: Date },
}, { timestamps: true });

export const Order = process.env.MONGODB_URI
  ? (mongoose.models.Order || mongoose.model('Order', orderSchema))
  : createModelAdapter('orders');
