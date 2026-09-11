import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const paymentSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billType: { type: String, enum: ['GST', 'NON_GST'], required: true },
  amount: { type: Number, required: true, min: 1 },
  mode: { type: String, enum: ['CASH', 'CHEQUE', 'UPI', 'NEFT'], default: 'CASH' },
  chequeNumber: { type: String },
  chequeBank: { type: String },
  chequeDate: { type: Date },
  chequePhotoUrl: { type: String },
  upiTransactionId: { type: String },
  notes: { type: String },
  isSettledWithWarehouse: { type: Boolean, default: false },
  settledAt: { type: Date },
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collectedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Payment = process.env.MONGODB_URI
  ? (mongoose.models.Payment || mongoose.model('Payment', paymentSchema))
  : createModelAdapter('payments');
