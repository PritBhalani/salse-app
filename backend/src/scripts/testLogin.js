import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

async function testAllLogins() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const testCases = [
    { label: 'Mobile 7874492405', id: '7874492405', pass: 'admin123' },
    { label: 'Mobile +91 7874492405', id: '+91 7874492405', pass: 'admin123' },
    { label: 'Email vivekbhalani74@gmail.com', id: 'vivekbhalani74@gmail.com', pass: 'admin123' },
    { label: 'Name Vivek patel', id: 'Vivek patel', pass: 'admin123' },
    { label: 'Warehouse 9898022222', id: '9898022222', pass: 'warehouse123' },
    { label: 'Salesman 9898033333', id: '9898033333', pass: 'sales123' },
  ];

  for (const tc of testCases) {
    const rawIdentifier = tc.id.trim();
    const digitsOnly = rawIdentifier.replace(/[^0-9]/g, '');
    const last10Digits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    const queryOr = [
      { phone: rawIdentifier },
      { email: rawIdentifier.toLowerCase() },
      { name: new RegExp(`^${rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    ];
    if (digitsOnly) queryOr.push({ phone: digitsOnly });
    if (last10Digits && last10Digits !== digitsOnly) queryOr.push({ phone: last10Digits });

    const user = await User.findOne({ $or: queryOr });
    if (!user) {
      console.log(`❌ [${tc.label}] -> User NOT found`);
      continue;
    }
    const isMatch = await user.matchPassword(tc.pass);
    if (!isMatch) {
      console.log(`❌ [${tc.label}] -> Password mismatch for ${user.name}`);
    } else {
      console.log(`✅ [${tc.label}] -> Logged in successfully as ${user.name} (${user.role})`);
    }
  }

  await mongoose.disconnect();
}

testAllLogins();
