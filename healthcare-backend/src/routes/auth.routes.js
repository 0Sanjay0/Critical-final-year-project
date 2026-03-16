// ═══════════════════════════════════════════════════════════
//  routes/auth.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

const {
  register,
  login,
  getMe,
  changePassword,
  updateProfile,
} = require('../controllers/auth.controller');

const { authenticate }   = require('../middleware/auth.middleware');
const { profileUpload }  = require('../config/multer');

// ── Public routes (no auth required) ──────────────────────

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// ── Protected routes (JWT required) ───────────────────────

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// PUT /api/auth/change-password
router.put('/change-password', authenticate, changePassword);

// PUT /api/auth/profile
// Optional profile picture upload via multipart/form-data
router.put(
  '/profile',
  authenticate,
  profileUpload.single('profilePicture'),
  updateProfile
);

module.exports = router;
