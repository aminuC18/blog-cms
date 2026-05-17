import { queryOptions } from '@tanstack/react-query';
import { fetchUploads } from '@/lib/api/uploads.api';

/** Shared cache for Files page and cover/OG library picker. */
export const uploadsLibraryQueryKey = (params?: { cursor?: string; limit?: number }) =>
  ['uploads', 'library', params?.limit ?? 24, params?.cursor ?? null] as const;

export const UPLOADS_LIBRARY_STALE_MS = 10 * 60 * 1000;
export const UPLOADS_LIBRARY_GC_MS = 30 * 60 * 1000;

export function uploadsLibraryQueryOptions(params?: { cursor?: string; limit?: number }) {
  const limit = params?.limit ?? 24;
  return queryOptions({
    queryKey: uploadsLibraryQueryKey(params),
    queryFn: () => fetchUploads({ cursor: params?.cursor, limit }),
    staleTime: UPLOADS_LIBRARY_STALE_MS,
    gcTime: UPLOADS_LIBRARY_GC_MS,
  });
}

/** Smaller Cloudinary delivery for grid thumbnails (faster modal paint). */
export function cloudinaryThumbnailUrl(url: string, width = 320, height = 180): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  if (url.includes('/upload/w_')) {
    return url;
  }
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`);
}
