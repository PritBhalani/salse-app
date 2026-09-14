import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dbStore } from '../data/dbStore.js';
import { getSeedDataset } from '../seeds/seedData.js';

dotenv.config();

export const connectDB = async () => {
  if (process.env.MONGODB_URI) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 50,
        minPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log(`🌿 Connected to live MongoDB: ${conn.connection.host}`);
      return { mode: 'MONGO', connection: conn };
    } catch (err) {
      console.warn(`⚠️ Could not connect to MongoDB URI (${err.message}). Falling back to embedded local data store.`);
    }
  }

  // Initialize embedded persistent JSON/memory store
  console.log('⚡ Initializing embedded zero-dependency wholesale datastore...');
  const seedDataset = await getSeedDataset();
  dbStore.init(seedDataset);
  console.log('✅ Embedded Wholesale Database Ready & Operational!');
  return { mode: 'EMBEDDED_STORE', store: dbStore };
};
