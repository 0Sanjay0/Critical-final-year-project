// ═══════════════════════════════════════════════════════════
//  routes/admin.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

const {
  getPendingVerifications,
  getAllUsers,
  getUserById,
  verifyAccount,
  toggleUserActive,
  getSystemStats,
  deleteUser,
} = require('../controllers/admin.controller');

const { authenticate }   = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { ROLES }          = require('../utils/constants');

// All admin routes — must be authenticated AND be admin role
router.use(authenticate);
router.use(authorizeRoles(ROLES.ADMIN));

// GET  /api/admin/stats
router.get('/stats', getSystemStats);

// GET  /api/admin/pending
router.get('/pending', getPendingVerifications);

// GET  /api/admin/users
router.get('/users', getAllUsers);

// GET  /api/admin/users/:userId
router.get('/users/:userId', getUserById);

// PATCH /api/admin/verify/:userId    body: { status, rejectionReason?, adminNote? }
router.patch('/verify/:userId', verifyAccount);

// PATCH /api/admin/users/:userId/toggle-active
router.patch('/users/:userId/toggle-active', toggleUserActive);

// DELETE /api/admin/users/:userId  body: { confirm: 'DELETE' }
router.delete('/users/:userId', deleteUser);

module.exports = router;
