import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function dumpDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in backend/.env');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB Database...');
    await mongoose.connect(uri);
    console.log('✅ Connected successfully!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`, collections.map((c) => c.name));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, `../../../db_backups/backup_${timestamp}`);
    const latestDir = path.join(__dirname, `../../../db_backups/latest`);

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    if (!fs.existsSync(latestDir)) fs.mkdirSync(latestDir, { recursive: true });

    const summary = {
      backupTimestamp: new Date().toISOString(),
      databaseName: db.databaseName,
      collections: {},
      totalRecords: 0,
    };

    for (const col of collections) {
      const data = await db.collection(col.name).find({}).toArray();
      const colFilePath = path.join(backupDir, `${col.name}.json`);
      const latestFilePath = path.join(latestDir, `${col.name}.json`);

      fs.writeFileSync(colFilePath, JSON.stringify(data, null, 2), 'utf-8');
      fs.writeFileSync(latestFilePath, JSON.stringify(data, null, 2), 'utf-8');

      console.log(`💾 [${col.name}] -> ${data.length} records saved`);
      summary.collections[col.name] = data.length;
      summary.totalRecords += data.length;
    }

    fs.writeFileSync(path.join(backupDir, '_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
    fs.writeFileSync(path.join(latestDir, '_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

    console.log('\n======================================================');
    console.log(`🎉 BACKUP SUCCESSFUL! Total: ${summary.totalRecords} records across ${collections.length} collections.`);
    console.log(`📂 Saved to timestamped folder: ${backupDir}`);
    console.log(`📂 Saved to latest folder: ${latestDir}`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error backing up MongoDB database:', err);
    process.exit(1);
  }
}

dumpDB();
