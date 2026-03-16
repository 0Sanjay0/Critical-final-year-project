// ═══════════════════════════════════════════════════════════
//  server.js — Healthcare Management System Entry Point
// ═══════════════════════════════════════════════════════════

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const connectDB        = require('./src/config/db');
const errorMiddleware  = require('./src/middleware/error.middleware');

// ── Initialize Express ───────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ───────────────────────────────────────
connectDB();

// ═══════════════════════════════════════════════════════════
//  SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployment for this project
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS: origin not allowed'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter — 100 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === 'production' ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
});
app.use('/api', globalLimiter);

// Stricter limiter for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === 'production' ? 20 : 200,
  message: { success: false, message: 'Too many auth attempts, please wait 15 minutes.' },
});

// ═══════════════════════════════════════════════════════════
//  GENERAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/qr',      express.static(path.join(__dirname, 'qr')));

// ═══════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success:     true,
    message:     'Healthcare API is running',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ── Auth (Step 3) ────────────────────────────────────────────
const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authLimiter, authRoutes);

// ── Patient (Step 5) ─────────────────────────────────────────
const patientRoutes = require('./src/routes/patient.routes');
app.use('/api/patient', patientRoutes);

// ── Doctor ────────────────────────────────────────────────────
const doctorRoutes = require('./src/routes/doctor.routes');
app.use('/api/doctor', doctorRoutes);

// ── Lab (report uploads) ──────────────────────────────────────
const labRoutes = require('./src/routes/lab.routes');
app.use('/api/lab', labRoutes);

// ── Hospital management
const hospitalRoutes = require('./src/routes/hospital.routes');
app.use('/api/hospital', hospitalRoutes);

// ── Verification (Step 4) ────────────────────────────────────
const verificationRoutes = require('./src/routes/verification.routes');
app.use('/api/verification', verificationRoutes);

// ── Admin (Step 4) ───────────────────────────────────────────
const adminRoutes = require('./src/routes/admin.routes');
app.use('/api/admin', adminRoutes);

// ── Appointments (Step 7) ────────────────────────────────────
const appointmentRoutes = require('./src/routes/appointment.routes');
app.use('/api/appointments', appointmentRoutes);

// ── Emergency QR (Step 6) ────────────────────────────────────
const emergencyRoutes = require('./src/routes/emergency.routes');
app.use('/api/emergency', emergencyRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ═══════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER — must be last
// ═══════════════════════════════════════════════════════════
app.use(errorMiddleware);

// ── Start Server ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Healthcare Management System — API      ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Status : Running                         ║`);
  console.log(`║  Port   : ${PORT}                             ║`);
  console.log(`║  Env    : ${(process.env.NODE_ENV || 'development').padEnd(29)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});

module.exports = app;
