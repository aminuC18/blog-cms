import { api } from '@/lib/api/axios';

export interface UploadAsset {
  publicId: string;
  url: string;
  format: string;
  resourceType: string;
  bytes?: number;
  createdAt: string;
  width?: number;
  height?: number;
}

export async function fetchUploads(params?: { cursor?: string; limit?: number }) {
  const { data: body } = await api.get<{ data: { items: UploadAsset[]; nextCursor: string | null } }>(
    '/uploads',
    { params },
  );
  return body.data;
}

export async function uploadDashboardFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data: body } = await api.post('/uploads/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return body.data as {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
    resourceType?: string;
  };
}
