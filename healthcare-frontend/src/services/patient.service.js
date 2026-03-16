import api from './api';

export const patientService = {
  getProfile:    ()           => api.get('/patient/profile'),
  updateProfile: (data)       => api.put('/patient/profile', data),
  getSummary:    ()           => api.get('/patient/summary'),

  addAllergy:    (data)       => api.post('/patient/allergies', data),
  removeAllergy: (id)         => api.delete(`/patient/allergies/${id}`),

  addDisease:    (data)       => api.post('/patient/diseases', data),
  removeDisease: (id)         => api.delete(`/patient/diseases/${id}`),

  addMedication:    (data)    => api.post('/patient/medications', data),
  updateMedication: (id, d)   => api.put(`/patient/medications/${id}`, d),
  removeMedication: (id)      => api.delete(`/patient/medications/${id}`),

  addEmergencyContact:    (data)   => api.post('/patient/emergency-contacts', data),
  updateEmergencyContact: (id, d)  => api.put(`/patient/emergency-contacts/${id}`, d),
  removeEmergencyContact: (id)     => api.delete(`/patient/emergency-contacts/${id}`),

  uploadRecord: (formData) => api.post('/patient/records/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getRecords:   (type) => api.get('/patient/records', { params: type ? { type } : {} }),
  getRecord:    (id)   => api.get(`/patient/records/${id}`),
  deleteRecord: (id)   => api.delete(`/patient/records/${id}`),
};
