import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://shivammarketing999_db_user:shivam999@cluster0.zkp0opm.mongodb.net/salase_wholesale?retryWrites=true&w=majority&appName=Cluster0';

async function updateVariants() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to Atlas!');

  const allProducts = await Product.find();
  console.log(`Found ${allProducts.length} products to check for variants...`);

  for (const p of allProducts) {
    if (p.name.includes('CPVC') || p.name.includes('Astral')) {
      p.hasVariants = true;
      p.variants = [
        { size: '1/2" (15mm)', sku: 'PIP-CPVC-15MM', basePrice: 180, boxQuantity: 25, stockQuantity: 150, isOutOfStock: false },
        { size: '3/4" (20mm)', sku: 'PIP-CPVC-20MM', basePrice: 260, boxQuantity: 20, stockQuantity: 180, isOutOfStock: false },
        { size: '1" (25mm)', sku: 'PIP-CPVC-25MM', basePrice: 340, boxQuantity: 15, stockQuantity: 120, isOutOfStock: false },
        { size: '1.25" (32mm)', sku: 'PIP-CPVC-32MM', basePrice: 490, boxQuantity: 10, stockQuantity: 80, isOutOfStock: false },
      ];
      p.basePrice = 180;
      p.stockQuantity = 530;
      await p.save();
      console.log('Updated Astral CPVC Pipe with 4 size variants.');
    } else if (p.name.includes('UPVC') || p.name.includes('Ashirvad')) {
      p.hasVariants = true;
      p.variants = [
        { size: '1/2" (15mm)', sku: 'PIP-UPVC-15MM', basePrice: 140, boxQuantity: 25, stockQuantity: 250, isOutOfStock: false },
        { size: '3/4" (20mm)', sku: 'PIP-UPVC-20MM', basePrice: 190, boxQuantity: 20, stockQuantity: 200, isOutOfStock: false },
        { size: '1" (25mm)', sku: 'PIP-UPVC-25MM', basePrice: 270, boxQuantity: 15, stockQuantity: 150, isOutOfStock: false },
      ];
      p.basePrice = 140;
      p.stockQuantity = 600;
      await p.save();
      console.log('Updated Ashirvad UPVC Pipe with 3 size variants.');
    } else if (p.name.includes('Brass Bib Cock') && p.brand === 'Jaquar') {
      p.hasVariants = true;
      p.variants = [
        { size: 'Standard (15mm)', sku: 'FIT-BIB-STD', basePrice: 480, boxQuantity: 12, stockQuantity: 80, isOutOfStock: false },
        { size: 'Long Body (15mm)', sku: 'FIT-BIB-LONG', basePrice: 580, boxQuantity: 10, stockQuantity: 60, isOutOfStock: false },
      ];
      p.basePrice = 480;
      p.stockQuantity = 140;
      await p.save();
      console.log('Updated Jaquar Bib Cock with 2 size variants.');
    } else if (p.name.includes('Ball Valve') || p.sku?.includes('VAL-BALL')) {
      p.hasVariants = true;
      p.variants = [
        { size: '1/2" (15mm)', sku: 'VAL-BALL-15MM', basePrice: 240, boxQuantity: 20, stockQuantity: 60, isOutOfStock: false },
        { size: '3/4" (20mm)', sku: 'VAL-BALL-20MM', basePrice: 320, boxQuantity: 15, stockQuantity: 50, isOutOfStock: false },
        { size: '1" (25mm)', sku: 'VAL-BALL-25MM', basePrice: 420, boxQuantity: 12, stockQuantity: 40, isOutOfStock: false },
        { size: '1.5" (40mm)', sku: 'VAL-BALL-40MM', basePrice: 680, boxQuantity: 8, stockQuantity: 30, isOutOfStock: false },
      ];
      p.basePrice = 240;
      p.stockQuantity = 180;
      p.isOutOfStock = false;
      await p.save();
      console.log('Updated Ball Valve with 4 size variants.');
    }
  }

  await mongoose.disconnect();
  console.log('Finished updating variants in Atlas!');
}

updateVariants().catch(console.error);
