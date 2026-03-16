const express = require('express');
const router  = express.Router();
const { getAffiliationStatus, requestAffiliation, acceptInvite, declineInvite, leaveHospital, getMyPatients } = require('../controllers/doctor.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeRoles, requireVerified } = require('../middleware/role.middleware');
const { ROLES } = require('../utils/constants');

router.use(authenticate, authorizeRoles(ROLES.DOCTOR), requireVerified);

router.get('/affiliation-status',    getAffiliationStatus);
router.post('/request-affiliation',  requestAffiliation);
router.post('/accept-invite',        acceptInvite);
router.post('/decline-invite',       declineInvite);
router.delete('/leave-hospital',     leaveHospital);
router.get('/my-patients',           getMyPatients);

module.exports = router;
