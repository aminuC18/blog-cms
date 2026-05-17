import { apiUrl } from '@/lib/utils';
import type { ApiResponse, Blog, PaginatedMeta, Tag, User } from '@/types/api.types';

async function publicFetch<T>(path: string) {
  try {
    const response = await fetch(`${apiUrl}${path}`, { next: { revalidate: 60 } });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    const payload = (await response.json()) as ApiResponse<T>;
    return payload;
  } catch {
    return { success: true, data: [] as T };
  }
}

export async function fetchPublicBlogs(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  const payload = await publicFetch<Blog[]>(`/public/blogs?${query.toString()}`);
  return { items: payload.data, meta: payload.meta as PaginatedMeta };
}

export async function fetchPublicBlog(slug: string) {
  const payload = await publicFetch<Blog>(`/public/blogs/${slug}`);
  if (!payload.data || Array.isArray(payload.data)) {
    throw new Error('Blog not found');
  }
  return payload.data;
}

export async function fetchPublicTags() {
  const payload = await publicFetch<Tag[]>('/public/tags');
  return payload.data;
}

export async function fetchPublicAuthor(username: string) {
  const payload = await publicFetch<User>(`/public/authors/${username}`);
  if (!payload.data || Array.isArray(payload.data)) {
    throw new Error('Author not found');
  }
  return payload.data;
}

export async function searchPublicBlogs(q: string, page = 1) {
  const payload = await publicFetch<Blog[]>(
    `/public/search?q=${encodeURIComponent(q)}&page=${page}`,
  );
  return { items: payload.data, meta: payload.meta as PaginatedMeta };
}

export async function fetchSitemapEntries() {
  const payload = await publicFetch<Array<{ slug: string; updatedAt: string }>>('/public/sitemap');
  return payload.data;
}
