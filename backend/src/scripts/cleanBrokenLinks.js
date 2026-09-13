import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function cleanLinks() {
  console.log('Connecting to MongoDB Atlas...');
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  const col = conn.connection.db.collection('products');

  const before = await col.find({ imageUrl: /uploads/ }).toArray();
  console.log(`Found ${before.length} products with broken uploads URLs.`);

  const res = await col.updateMany(
    { imageUrl: /uploads/ },
    { $set: { imageUrl: '' } }
  );
  console.log(`✅ Cleaned ${res.modifiedCount} products in MongoDB Atlas.`);

  const after = await col.countDocuments({ imageUrl: /uploads/ });
  console.log(`Remaining broken URLs: ${after}`);

  await mongoose.disconnect();
}

cleanLinks().catch((err) => {
  console.error('Failed to clean links:', err);
  process.exit(1);
});
