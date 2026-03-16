// ─────────────────────────────────────────
//  config/db.js — MongoDB connection handler
// ─────────────────────────────────────────

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options prevent deprecation warnings in Mongoose 8.x
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events after initial connect
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Exit process with failure — let process manager (PM2) restart
    process.exit(1);
  }
};

module.exports = connectDB;
