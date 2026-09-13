import mongoose from 'mongoose';
import { createModelAdapter } from '../data/dbStore.js';

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      default: 'image/jpeg',
    },
    data: {
      type: Buffer,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Media = process.env.MONGODB_URI
  ? (mongoose.models.Media || mongoose.model('Media', mediaSchema))
  : createModelAdapter('media');
