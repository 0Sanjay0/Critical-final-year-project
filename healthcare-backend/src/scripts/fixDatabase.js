// ═══════════════════════════════════════════════════════════
//  scripts/fixDatabase.js  — Run ONCE after fresh clone
//  node src/scripts/fixDatabase.js
// ═══════════════════════════════════════════════════════════
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const fix = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');
  const db = mongoose.connection.db;

  // ── 1. Drop ALL indexes on users except _id ───────────────
  console.log('── Fixing users indexes ──────────────────────');
  const usersCol = db.collection('users');
  const allIndexes = await usersCol.indexes();

  for (const idx of allIndexes) {
    if (idx.name === '_id_') continue; // never drop _id
    try {
      await usersCol.dropIndex(idx.name);
      console.log(`   Dropped: ${idx.name}`);
    } catch (e) {
      console.log(`   Skip:    ${idx.name} (${e.message})`);
    }
  }

  // ── 2. Recreate only the correct indexes ─────────────────
  // email: unique (all users must have unique email)
  await usersCol.createIndex({ email: 1 }, { unique: true, name: 'email_1' });
  console.log('   Created: email_1 (unique)');

  // qrId: unique + sparse (null values ignored — non-patients safe)
  await usersCol.createIndex({ qrId: 1 }, { unique: true, sparse: true, name: 'qrId_sparse' });
  console.log('   Created: qrId_sparse (unique + sparse)\n');

  // ── 3. Fix medicalrecords validators ──────────────────────
  console.log('── Fixing medicalrecords ─────────────────────');
  const cols = await db.listCollections({ name: 'medicalrecords' }).toArray();
  if (cols.length) {
    await db.command({ collMod: 'medicalrecords', validator: {}, validationLevel: 'off' });
    console.log('   Cleared validators on medicalrecords\n');
  } else {
    console.log('   medicalrecords not yet created (will be fine)\n');
  }

  // ── 4. Verify ─────────────────────────────────────────────
  const finalIndexes = await usersCol.indexes();
  console.log('── Final user indexes ────────────────────────');
  finalIndexes.forEach(i => console.log(`   ${i.name}:`, JSON.stringify(i.key), i.sparse ? '(sparse)' : ''));

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  ✅  Database fixed. Restart your server. ║');
  console.log('╚══════════════════════════════════════════╝');

  await mongoose.disconnect();
  process.exit(0);
};

fix().catch(err => { console.error('❌', err.message); process.exit(1); });
