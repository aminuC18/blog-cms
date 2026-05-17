import { api } from '@/lib/api/axios';
import type { ApiResponse, PaginatedMeta, Role, User } from '@/types/api.types';

export async function fetchUsers(params: Record<string, string | number | undefined> = {}) {
  const { data } = await api.get<ApiResponse<User[]>>('/users', { params });
  return { items: data.data, meta: data.meta as PaginatedMeta };
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const { data } = await api.post<ApiResponse<User>>('/users', payload);
  return data.data;
}
