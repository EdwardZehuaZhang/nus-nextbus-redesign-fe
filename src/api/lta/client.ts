import { Env } from '@/lib/env';
import axios from 'axios';

const LTA_API_BASE = 'https://datamall2.mytransport.sg/ltaodataservice';

export const ltaClient = axios.create({
  baseURL: LTA_API_BASE,
  headers: {
    AccountKey: Env.LTA_API_KEY,
    accept: 'application/json',
  },
  timeout: 10000,
});

// Add response interceptor for error handling
ltaClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('LTA API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('LTA API No Response:', error.request);
    } else {
      console.error('LTA API Error:', error.message);
    }
    return Promise.reject(error);
  }
);
