import axios from 'axios';

export const BASE_URL = 'https://salse-app.onrender.com/api';

export const mobileAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for Render cold start
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

let authToken = null;
let activeDeviceId = 'ANDROID_DEVICE_SALES_01';

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    mobileAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete mobileAPI.defaults.headers.common['Authorization'];
  }
};

export const setDeviceId = (id) => {
  activeDeviceId = id;
};

// Request Interceptor: Guarantees token is always attached to every request
mobileAPI.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    config.headers['x-device-id'] = activeDeviceId;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Logs any network errors
mobileAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn(
      'Mobile API Error:',
      error.config?.url,
      error.response?.status,
      error.response?.data?.message || error.message
    );
    return Promise.reject(error);
  }
);
