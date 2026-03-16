const path = require('path');

// Debug: show exactly where we're looking for .env
const envPath = path.resolve(__dirname, '../../.env');
console.log('📁 Looking for .env at:', envPath);

const result = require('dotenv').config({ path: envPath });
if (result.error) {
  console.log('❌ dotenv error:', result.error.message);
} else {
  console.log('✅ .env loaded successfully');
  console.log('   MONGO_URI:', process.env.MONGO_URI ? '✅ Found' : '❌ Missing');
}

const mongoose = require('mongoose');
const User     = require('../models/User.model');
const { ROLES, VERIFICATION_STATUS } = require('../utils/constants');

const ADMIN = {
  firstName:          'System',
  lastName:           'Admin',
  email:              process.env.ADMIN_EMAIL    || 'admin@healthcare.com',
  password:           process.env.ADMIN_PASSWORD || 'Admin@123456',
  role:               ROLES.ADMIN,
  verificationStatus: VERIFICATION_STATUS.APPROVED,
  isActive:           true,
};

const seed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log('');
      console.log('── TROUBLESHOOTING ──────────────────────────────────');
      console.log('1. Make sure .env exists at:', envPath);
      console.log('2. Open .env in Notepad and confirm it contains:');
      console.log('   MONGO_URI=mongodb://localhost:27017/healthcare_db');
      console.log('3. Make sure the file is saved as .env not .env.txt');
      console.log('   (In Windows, open a terminal and run: dir /a');
      console.log('    to see all files including hidden ones)');
      console.log('─────────────────────────────────────────────────────');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log('ℹ️  Admin already exists:', ADMIN.email);
      await mongoose.disconnect();
      process.exit(0);
    }

    await User.create(ADMIN);
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║          Admin Account Created            ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Email   : ${ADMIN.email.padEnd(30)}║`);
    console.log(`║  Password: ${ADMIN.password.padEnd(30)}║`);
    console.log('╚══════════════════════════════════════════╝');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
