import axios from 'axios';

// Replace with local Wi-Fi IP (e.g. 192.168.1.X) when testing on physical Android device
export const BASE_URL = 'https://salse-app.onrender.com/';

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
