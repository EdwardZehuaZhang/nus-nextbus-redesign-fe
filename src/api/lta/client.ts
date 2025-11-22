import { Env } from '@/lib/env';
import axios from 'axios';

// Use backend gateway for LTA API calls
// Backend handles authentication - no API key needed in frontend
export const ltaClient = axios.create({
  baseURL: `${Env.BACKEND_API_URL}/api/lta`,
  timeout: 10000,
});

// Minimal request logging to validate integration
ltaClient.interceptors.request.use((config) => {
  try {
    // eslint-disable-next-line no-console
    console.log('[lta-client] →', (config.baseURL || '') + (config.url || ''), config.params || {});
  } catch {}
  return config;
});

// Add response interceptor for error handling
ltaClient.interceptors.response.use(
  (response) => {
    try {
      // eslint-disable-next-line no-console
      console.log('[lta-client] ←', response.status, response.config?.url || '');
    } catch {}
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('LTA API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('LTA API No Response:', error.request);
    } else {
      console.error('LTA API Error:', error.message);
    }
    try {
      // eslint-disable-next-line no-console
      console.warn('[lta-client] ×', error?.response?.status, error?.config?.url || '', error?.message);
    } catch {}
    return Promise.reject(error);
  }
);
