// api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Doctor Profile APIs
export const getDoctorProfile = () => api.get('/doctors/profile');
export const updateDoctorProfile = (profileData) => api.put('/doctors/profile', profileData);
export const getAllDoctors = () => api.get('/doctors');

// Appointment APIs
export const bookAppointment = (appointmentData) => api.post('/appointments/book', appointmentData);