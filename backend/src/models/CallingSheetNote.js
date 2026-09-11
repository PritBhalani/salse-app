import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const callingSheetNoteSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  plannedVisitDate: { type: Date, required: true },
  calledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  callStatus: {
    type: String,
    enum: [
      'PENDING',
      'PAYMENT_READY',
      'ORDER_READY',
      'BOTH_READY',
      'SHOP_CLOSED',
      'CALL_BACK',
      'NO_ANSWER',
    ],
    default: 'PENDING',
  },
  expectedPaymentAmount: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  calledAt: { type: Date },
}, { timestamps: true });

export const CallingSheetNote = process.env.MONGODB_URI
  ? (mongoose.models.CallingSheetNote || mongoose.model('CallingSheetNote', callingSheetNoteSchema))
  : createModelAdapter('callingsheetnotes');
