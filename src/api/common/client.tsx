import { Env } from '@env';
import axios from 'axios';

export const client = axios.create({
  baseURL: Env.API_URL,
  auth: {
    username: 'NUSnextbus',
    password: '13dL?zY,3feWR^"T',
  },
});
