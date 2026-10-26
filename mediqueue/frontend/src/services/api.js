import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle responses and expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    if (error.response?.status === 401) {
      // Clear token and user if unauthorized
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Do not force redirect if already on login page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login?expired=1';
        }
      }
    }

    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  registerDoctor: (doctorData) => api.post('/auth/doctor/register', doctorData),
  registerOrganisation: (organisationData) => api.post('/organisations/register', organisationData),
  getMe: () => api.get('/auth/me'),
};

export const organisationAPI = {
  getMyOrganisation: () => api.get('/organisations/me'),
  getMyDoctors: () => api.get('/organisations/me/doctors'),
  addDoctor: (data) => api.post('/organisations/me/doctors', data),
  updateDoctorAffiliation: (id, data) => api.patch(`/organisations/me/doctors/${id}`, data),
  getPending: () => api.get('/organisations/superadmin/pending'),
  review: (id, decision) => api.patch(`/organisations/superadmin/${id}/${decision}`),
};

export const doctorAPI = {
  getDoctors: (params) => api.get('/doctors', { params }),
  getDoctorById: (id) => api.get(`/doctors/${id}`),
  getDoctorSlots: (id, date, orgId) => api.get(`/doctors/${id}/slots`, { params: { date, orgId } }),
  getMyProfile: () => api.get('/doctors/me'),
  updateMyProfile: (data) => api.put('/doctors/me', data),
  resubmitApplication: (data) => api.post('/doctors/me/resubmit', data),
  updateMyAvailability: (data) => api.put('/doctors/me/availability', data),
};

export const adminAPI = {
  getReports: () => api.get('/admin/reports'),
  getDoctors: (params) => api.get('/admin/doctors', { params }),
  createDoctor: (data) => api.post('/admin/doctors', data),
  updateDoctor: (id, data) => api.put(`/admin/doctors/${id}`, data),
  toggleDoctorStatus: (id) => api.patch(`/admin/doctors/${id}/toggle`),
  approveDoctor: (id) => api.patch(`/admin/doctors/${id}/approve`, {}),
  requestChanges: (id, data) => api.patch(`/admin/doctors/${id}/request-changes`, data),
  rejectDoctor: (id, data) => api.patch(`/admin/doctors/${id}/reject`, data),
  suspendDoctor: (id, data) => api.patch(`/admin/doctors/${id}/suspend`, data),
  getDoctorAuditTrail: (id) => api.get(`/admin/doctors/${id}/audit-trail`),
  getPatients: () => api.get('/admin/patients'),
  getDepartments: () => api.get('/admin/departments'),
};

export const notificationAPI = {
  getMyNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const appointmentAPI = {
  createAppointment: (data) => api.post('/appointments', data),
  getMyAppointments: () => api.get('/appointments/my'),
  getAllAppointments: (params) => api.get('/appointments/all', { params }),
  getDoctorAppointments: (params) => api.get('/appointments/doctor/me', { params }),
  getAppointmentById: (id) => api.get(`/appointments/${id}`),
  cancelAppointment: (id) => api.patch(`/appointments/${id}/cancel`),
};

export const queueAPI = {
  checkIn: (appointmentId) => api.post(`/queue/check-in/${appointmentId}`),
  getMyStatus: () => api.get('/queue/my-status'),
  getDoctorQueue: (doctorId, date) => api.get(`/queue/doctor/${doctorId}`, { params: { date } }),
  advanceQueue: (queueId, data = {}) => api.patch(`/queue/${queueId}/advance`, data),
};

export default api;
