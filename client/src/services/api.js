import axios from 'axios';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

console.log('API Base URL:', API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});
// Add token to requests automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle authentication errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  getCurrentUser: () => API.get('/auth/me'),
  logout: () => API.post('/auth/logout'),
};

// Submissions API calls
export const submissionsAPI = {
  create: (formData) => API.post('/submissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => API.get('/submissions'),
  getOne: (id) => API.get(`/submissions/${id}`),
  annotate: (id, annotationData) => API.put(`/submissions/${id}/annotate`, annotationData),
  generatePDF: (id) => API.post(`/submissions/${id}/generate-pdf`),
  downloadPDF: (id) => API.get(`/submissions/${id}/download-pdf`, {
    responseType: 'blob'
  }),
};

export default API;