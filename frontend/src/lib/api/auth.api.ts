import { api, setAccessToken } from '@/lib/api/axios';
import type { ApiResponse, User } from '@/types/api.types';

export async function login(email: string, password: string) {
  const { data } = await api.post<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: User;
  }>>('/auth/login', { email, password });
  setAccessToken(data.data.accessToken);
  return data.data;
}

export async function logout() {
  await api.post('/auth/logout');
  setAccessToken(null);
}

export async function getMe() {
  const { data } = await api.get<ApiResponse<User>>('/auth/me');
  return data.data;
}
