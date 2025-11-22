import { Env } from '@env';
import axios from 'axios';

// Use backend gateway for NUS NextBus API calls
// Backend handles authentication - no credentials needed in frontend
export const client = axios.create({
  baseURL: `${Env.BACKEND_API_URL}/api/bus`,
});

// Minimal request/response logging to help validate integration
client.interceptors.request.use((config) => {
  try {
    // eslint-disable-next-line no-console
    console.log('[bus-client] →', (config.baseURL || '') + (config.url || ''), config.params || {});
  } catch {}
  return config;
});

client.interceptors.response.use(
  (response) => {
    try {
      // eslint-disable-next-line no-console
      console.log('[bus-client] ←', response.status, response.config?.url || '');
    } catch {}
    return response;
  },
  (error) => {
    try {
      // eslint-disable-next-line no-console
      console.warn('[bus-client] ×', error?.response?.status, error?.config?.url || '', error?.message);
    } catch {}
    return Promise.reject(error);
  }
);
