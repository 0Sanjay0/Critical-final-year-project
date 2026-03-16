const express = require('express');
const router  = express.Router();
const { getAffiliatedDoctors, inviteDoctor, approveDoctor, removeDoctor, searchDoctors } = require('../controllers/hospital.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeRoles, requireVerified } = require('../middleware/role.middleware');
const { ROLES } = require('../utils/constants');

router.use(authenticate, authorizeRoles(ROLES.HOSPITAL), requireVerified);

router.get('/doctors',                          getAffiliatedDoctors);
router.get('/doctors/search',                   searchDoctors);
router.post('/doctors/:doctorUserId/invite',    inviteDoctor);
router.patch('/doctors/:doctorUserId/approve',  approveDoctor);
router.patch('/doctors/:doctorUserId/remove',   removeDoctor);

module.exports = router;
