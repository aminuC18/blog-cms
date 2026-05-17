import { api } from '@/lib/api/axios';
import type { ApiResponse, Tag } from '@/types/api.types';

export type CreateTagPayload = {
  name: string;
  description?: string;
  color?: string;
};

export async function fetchDashboardTags() {
  const { data } = await api.get<ApiResponse<Tag[]>>('/tags');
  return data.data;
}

export async function createTag(payload: CreateTagPayload) {
  const { data } = await api.post<ApiResponse<Tag>>('/tags', payload);
  return data.data;
}
