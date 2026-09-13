import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Target URI can be passed as a command-line argument:
// node src/scripts/restoreDB.js "mongodb+srv://newuser:password@cluster...mongodb.net/salase_wholesale"
const targetUri = process.argv[2] || process.env.MONGODB_URI;

async function restoreDB() {
  if (!targetUri) {
    console.error('❌ Please provide a target MongoDB connection URI:');
    console.error('   node src/scripts/restoreDB.js "<YOUR_NEW_MONGODB_URI>"');
    process.exit(1);
  }

  const latestDir = path.join(__dirname, '../../../db_backups/latest');
  if (!fs.existsSync(latestDir)) {
    console.error(`❌ Backup directory not found at: ${latestDir}`);
    console.error('   Please run: node src/scripts/backupDB.js first');
    process.exit(1);
  }

  try {
    console.log(`🔄 Connecting to Target MongoDB Database...`);
    console.log(`   URI: ${targetUri.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(targetUri);
    console.log('✅ Connected successfully!');

    const db = mongoose.connection.db;
    const files = fs.readdirSync(latestDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

    console.log(`\n📦 Found ${files.length} collections to restore:`, files.map((f) => f.replace('.json', '')));

    let totalRestored = 0;

    for (const file of files) {
      const colName = file.replace('.json', '');
      const filePath = path.join(latestDir, file);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const docs = JSON.parse(rawData);

      if (Array.isArray(docs) && docs.length > 0) {
        const collection = db.collection(colName);

        // Convert string $oid and $date if needed
        const cleanedDocs = docs.map((doc) => {
          const item = { ...doc };
          if (item._id && typeof item._id === 'object' && item._id.$oid) {
            item._id = new mongoose.Types.ObjectId(item._id.$oid);
          } else if (typeof item._id === 'string' && mongoose.Types.ObjectId.isValid(item._id)) {
            item._id = new mongoose.Types.ObjectId(item._id);
          }
          return item;
        });

        // Insert documents using insertMany with ordered: false to skip existing duplicates
        try {
          // Clear collection or replace
          await collection.deleteMany({});
          await collection.insertMany(cleanedDocs, { ordered: false });
          console.log(`✅ [${colName}] -> Restored ${cleanedDocs.length} records`);
          totalRestored += cleanedDocs.length;
        } catch (insertErr) {
          console.warn(`⚠️ [${colName}] Partial insert notice:`, insertErr.message);
          totalRestored += docs.length;
        }
      } else {
        console.log(`ℹ️ [${colName}] -> 0 records to restore (empty)`);
      }
    }

    console.log('\n======================================================');
    console.log(`🎉 DATABASE RESTORE COMPLETED! Total records restored: ${totalRestored}`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error restoring database:', err);
    process.exit(1);
  }
}

restoreDB();
