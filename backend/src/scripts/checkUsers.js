import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspectUsers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log('Total users in database:', users.length);
  users.forEach((u, i) => {
    console.log(`\n--- User ${i + 1} ---`);
    console.log('ID:', u._id);
    console.log('Name:', u.name);
    console.log('Phone:', u.phone);
    console.log('Email:', u.email);
    console.log('Role:', u.role);
    console.log('Active:', u.isActive);
    console.log('Bound Device ID:', u.deviceId || u.boundDeviceId || 'none');
    console.log('Password hash:', u.password ? u.password.slice(0, 20) + '...' : 'none');
  });
  await mongoose.disconnect();
}
inspectUsers();
