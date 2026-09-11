import axios from 'axios';

export const BASE_URL = 'https://salse-app.onrender.com/api';

export const mobileAPI = axios.create({
  baseURL: BASE_URL,
});

let authToken = null;
let activeDeviceId = 'ANDROID_DEVICE_SALES_01';

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    mobileAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    mobileAPI.defaults.headers.common['x-device-id'] = activeDeviceId;
  } else {
    delete mobileAPI.defaults.headers.common['Authorization'];
  }
};

export const setDeviceId = (id) => {
  activeDeviceId = id;
  mobileAPI.defaults.headers.common['x-device-id'] = id;
};
