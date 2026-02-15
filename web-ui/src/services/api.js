import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
};

// Streams API
export const streamsAPI = {
  getAll: (params) => api.get('/streams', { params }),
  getById: (id) => api.get(`/streams/${id}`),
  create: (data) => api.post('/streams', data),
  update: (id, data) => api.put(`/streams/${id}`, data),
  delete: (id) => api.delete(`/streams/${id}`),
  regenerateKey: (id) => api.post(`/streams/${id}/regenerate-key`),
  toggle: (id) => api.post(`/streams/${id}/toggle`),
};

// Sessions API
export const sessionsAPI = {
  getAll: () => api.get('/sessions'),
  getRecent: (limit) => api.get('/sessions/recent', { params: { limit } }),
  getStats: (params) => api.get('/sessions/stats', { params }),
  getById: (id) => api.get(`/sessions/${id}`),
  disconnect: (id) => api.delete(`/sessions/${id}`),
};

// Config API
export const configAPI = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data),
  health: () => api.get('/config/health'),
  stats: () => api.get('/config/stats'),
};

export default api;
