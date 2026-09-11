import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  cities: [{ type: String, required: true, trim: true }],
  assignedSalesman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  scheduleDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }],
  nextVisitDate: { type: Date },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Route = process.env.MONGODB_URI
  ? (mongoose.models.Route || mongoose.model('Route', routeSchema))
  : createModelAdapter('routes');
