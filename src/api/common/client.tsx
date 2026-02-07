import { Env } from '@env';
import axios from 'axios';

// Use backend gateway for NUS NextBus API calls
// Backend handles authentication - no credentials needed in frontend
export const client = axios.create({
  baseURL: `${Env.BACKEND_API_URL}/api/bus`,
});

// Minimal request/response logging to help validate integration
client.interceptors.request.use((config) => {
  return config;
});

client.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
