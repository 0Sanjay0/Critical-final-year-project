import api from './api';

export const appointmentService = {
  book:            (data)     => api.post('/appointments', data),
  getHospitals:    (params)   => api.get('/appointments/hospitals/list', { params }),
  getDoctors:      (params)   => api.get('/appointments/doctors/list', { params }),
  schedule:        (id, data) => api.patch(`/appointments/${id}/schedule`, data),
  applyReschedule: (id)       => api.patch(`/appointments/${id}/apply-reschedule`),
  confirm:         (id)       => api.patch(`/appointments/${id}/confirm`),
  rescheduleReq:   (id, data) => api.patch(`/appointments/${id}/reschedule-request`, data),
  start:           (id)       => api.patch(`/appointments/${id}/start`),
  complete:        (id, fd)   => api.patch(`/appointments/${id}/complete`, fd),
  cancel:          (id, data) => api.patch(`/appointments/${id}/cancel`, data),
  getAll:          (params)   => api.get('/appointments', { params }),
  getById:         (id)       => api.get(`/appointments/${id}`),
  getPatientRecords:(id)      => api.get(`/appointments/${id}/patient-records`),
};


export const emergencyService = {
  getByQrId:    (qrId) => api.get(`/emergency/patient/${qrId}`),
  getMyQRInfo:  ()     => api.get('/emergency/qr-info'),
  regenerateQR: ()     => api.post('/emergency/regenerate-qr'),
};

export const adminService = {
  getStats:      ()         => api.get('/admin/stats'),
  getPending:    ()         => api.get('/admin/pending'),
  getUsers:      (params)   => api.get('/admin/users', { params }),
  getUserById:   (id)       => api.get(`/admin/users/${id}`),
  verifyAccount: (id, data) => api.patch(`/admin/verify/${id}`, data),
  toggleActive:  (id)       => api.patch(`/admin/users/${id}/toggle-active`),
};

export const verificationService = {
  setupDoctor:   (fd) => api.post('/verification/doctor/setup', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  setupHospital: (fd) => api.post('/verification/hospital/setup', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  setupLab:      (fd) => api.post('/verification/lab/setup', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getProfile:    ()   => api.get('/verification/profile'),
};

export const doctorService = {
  sendPrescription: (appointmentId, fd) => api.post(
    `/doctor/appointments/${appointmentId}/prescription`, fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
  getMyPatients: () => api.get('/doctor/patients'),
};

export const labService = {
  searchPatient:    (email)  => api.get('/lab/patients/search', { params: { email } }),
  uploadReport:     (fd)     => api.post('/lab/upload-report', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getUploadedReports: (params) => api.get('/lab/reports', { params }),
};

export const hospitalManagementService = {
  getDoctors:    (params) => api.get('/hospital/doctors', { params }),
  searchDoctors: (params) => api.get('/hospital/doctors/search', { params }),
  inviteDoctor:  (id)     => api.post(`/hospital/doctors/${id}/invite`),
  approveDoctor: (id)     => api.patch(`/hospital/doctors/${id}/approve`),
  removeDoctor:  (id)     => api.patch(`/hospital/doctors/${id}/remove`),
};

export const doctorAffiliationService = {
  getStatus:     ()                  => api.get('/doctor/affiliation-status'),
  requestJoin:   (hospitalUserId)    => api.post('/doctor/request-affiliation', { hospitalUserId }),
  acceptInvite:  (hospitalUserId)    => api.post('/doctor/accept-invite',  { hospitalUserId }),
  declineInvite: (hospitalUserId)    => api.post('/doctor/decline-invite', { hospitalUserId }),
  leaveHospital: ()                  => api.delete('/doctor/leave-hospital'),
};
