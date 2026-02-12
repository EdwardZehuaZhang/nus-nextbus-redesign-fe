import { Env } from '@env';
import axios from 'axios';

// Use backend gateway for NUS NextBus API calls
// Backend handles authentication - no credentials needed in frontend
export const client = axios.create({
  baseURL: `${Env.BACKEND_API_URL}/api/bus`,
});

// Minimal request/response logging to help validate integration
client.interceptors.request.use((config) => {
  if (__DEV__) {
    console.log('[bus-client] →', (config.baseURL || '') + (config.url || ''), config.params || {});
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (__DEV__) {
      const status = error?.response?.status;
      const url = (error?.config?.baseURL || '') + (error?.config?.url || '');
      console.warn('[bus-client] ✖', status ?? 'NO_STATUS', url, error?.message);
    }
    return Promise.reject(error);
  }
);
