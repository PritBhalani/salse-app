import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createModelAdapter } from '../data/dbStore.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'WAREHOUSE', 'SALESMAN', 'SHOP_OWNER'], default: 'SALESMAN' },
  deviceId: { type: String, default: null },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  activeCities: [{ type: String }],
  cashInHand: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(enteredPassword, this.password);
    } catch (e) {
      return false;
    }
  }
  // Plain text fallback (e.g. if edited in MongoDB Atlas UI or script directly)
  if (this.password === enteredPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(enteredPassword, salt);
      await this.save();
    } catch (err) {
      console.warn('Auto-hash password error:', err.message);
    }
    return true;
  }
  return false;
};

export const User = process.env.MONGODB_URI
  ? (mongoose.models.User || mongoose.model('User', userSchema))
  : createModelAdapter('users');
