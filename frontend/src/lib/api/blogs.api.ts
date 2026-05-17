import { api } from '@/lib/api/axios';
import type { ApiResponse, Blog, PaginatedMeta } from '@/types/api.types';

export type BlogWritePayload = {
  title?: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  slug?: string;
};

export async function previewBlogSlug(title: string, excludeBlogId?: string) {
  const { data } = await api.get<ApiResponse<{ slug: string }>>('/blogs/slug-preview', {
    params: { title, excludeId: excludeBlogId },
  });
  return data.data.slug;
}

export async function fetchDashboardBlogs(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<ApiResponse<Blog[]>>('/blogs', { params });
  return { items: data.data, meta: data.meta as PaginatedMeta };
}

export async function fetchBlog(id: string) {
  const { data } = await api.get<ApiResponse<Blog>>(`/blogs/${id}`);
  return data.data;
}

export async function createBlog(payload: BlogWritePayload & { title: string; summary: string }) {
  const { data } = await api.post<ApiResponse<Blog>>('/blogs', payload);
  return data.data;
}

export async function updateBlog(id: string, payload: BlogWritePayload) {
  const { data } = await api.patch<ApiResponse<Blog>>(`/blogs/${id}`, payload);
  return data.data;
}

export async function submitBlogForReview(id: string) {
  const { data } = await api.post<ApiResponse<Blog>>(`/blogs/${id}/submit-review`);
  return data.data;
}

export async function publishBlog(id: string, scheduledAt?: string) {
  const body = scheduledAt ? { scheduledAt } : {};
  const { data } = await api.post<ApiResponse<Blog>>(`/blogs/${id}/publish`, body);
  return data.data;
}

export async function approveBlog(id: string) {
  const { data } = await api.post<ApiResponse<Blog>>(`/blogs/${id}/approve`);
  return data.data;
}

export async function reviewBlog(id: string, reviewNotes?: string) {
  const { data } = await api.post<ApiResponse<Blog>>(`/blogs/${id}/review`, {
    reviewNotes: reviewNotes ?? '',
  });
  return data.data;
}

export async function rejectBlog(id: string, reason: string) {
  const { data } = await api.post<ApiResponse<Blog>>(`/blogs/${id}/reject`, { reason });
  return data.data;
}

export async function unpublishBlog(id: string) {
  const { data } = await api.post<ApiResponse<Blog>>(`/blogs/${id}/unpublish`);
  return data.data;
}

export async function deleteBlog(id: string) {
  const { data } = await api.delete<ApiResponse<Blog>>(`/blogs/${id}`);
  return data.data;
}
