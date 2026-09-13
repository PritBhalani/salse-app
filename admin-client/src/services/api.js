import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('salase_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: (role) => api.get(`/auth/users${role ? `?role=${role}` : ''}`),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  resetDevice: (userId) => api.put(`/auth/users/${userId}/reset-device`),
};

export const shopsAPI = {
  getAll: (params) => api.get('/shops', { params }),
  getById: (id) => api.get(`/shops/${id}`),
  create: (data) => api.post('/shops', data),
  update: (id, data) => api.put(`/shops/${id}`, data),
  delete: (id) => api.delete(`/shops/${id}`),
};

export const routesAPI = {
  getAll: () => api.get('/routes'),
  getById: (id) => api.get(`/routes/${id}`),
  create: (data) => api.post('/routes', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  delete: (id) => api.delete(`/routes/${id}`),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  toggleStock: (id) => api.patch(`/products/${id}/toggle-stock`),
  delete: (id) => api.delete(`/products/${id}`),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status, dispatchNotes) => api.patch(`/orders/${id}/status`, { status, dispatchNotes }),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  record: (data) => api.post('/payments', data),
  settleCash: (salesmanId, amount) => api.post('/payments/settle-cash', { salesmanId, amount }),
};

export const uploadAPI = {
  uploadPhoto: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const callingSheetAPI = {
  get: (params) => api.get('/calling-sheet', { params }),
  logCall: (data) => api.post('/calling-sheet/log-call', data),
};

export const visitsAPI = {
  getAll: (params) => api.get('/visits', { params }),
};

export default api;
