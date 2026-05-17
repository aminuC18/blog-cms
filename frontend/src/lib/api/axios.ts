import axios from 'axios';
import { apiUrl } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${apiUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const token = refreshResponse.data?.data?.accessToken ?? refreshResponse.data?.accessToken;
        if (token) {
          setAccessToken(token);
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(
      Object.assign(error, {
        userMessage: getErrorMessage(error),
      }),
    );
  },
);
