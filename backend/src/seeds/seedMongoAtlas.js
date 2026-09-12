import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Route } from '../models/Route.js';
import { Shop } from '../models/Shop.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { CallingSheetNote } from '../models/CallingSheetNote.js';
import { getSeedDataset } from './seedData.js';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://shivammarketing999_db_user:shivam999@cluster0.zkp0opm.mongodb.net/salase_wholesale?retryWrites=true&w=majority&appName=Cluster0';

async function runSeed() {
  console.log(`Connecting to MongoDB Atlas...`);
  await mongoose.connect(MONGODB_URI);
  console.log('🌿 Connected to MongoDB Atlas successfully!');

  console.log('🧹 Clearing existing collections in Atlas...');
  await Promise.all([
    User.deleteMany({}),
    Route.deleteMany({}),
    Shop.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    CallingSheetNote.deleteMany({}),
  ]);

  console.log('🌱 Generating and injecting seed dataset...');
  const data = await getSeedDataset();

  await User.insertMany(data.users);
  await Route.insertMany(data.routes);
  await Shop.insertMany(data.shops);
  await Product.insertMany(data.products);
  await Order.insertMany(data.orders);
  await Payment.insertMany(data.payments);
  await CallingSheetNote.insertMany(data.callNotes);

  console.log('\n🎉 MongoDB Atlas Seeded Successfully with:');
  console.log(`- ${data.users.length} Users (Uncle Boss, Warehouse Manager, Salesmen, Shop Owner)`);
  console.log(`- ${data.routes.length} Multi-City Beats (Morbi, Wankaner, Rajkot, Gondal)`);
  console.log(`- ${data.shops.length} Retail Shops with Dual Ledger Balances (GST & Rough)`);
  console.log(`- ${data.products.length} Products (Astral/Ashirvad pipes, Jaquar/Cera bib cocks, sanitaryware)`);
  console.log(`- ${data.orders.length} Wholesale Orders with Master Box Counts`);
  console.log(`- ${data.payments.length} Payment Collections`);
  console.log(`- ${data.callNotes.length} Pre-Visit Calling Sheet Records`);

  await mongoose.disconnect();
  console.log('\n✅ Connection closed. Database is ready for live operations!');
}

runSeed().catch((err) => {
  console.error('❌ Atlas Seeding Error:', err);
  process.exit(1);
});
