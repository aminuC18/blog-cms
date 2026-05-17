import type { MetadataRoute } from 'next';
import { fetchSitemapEntries } from '@/lib/api/public.api';
import { siteUrl } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await fetchSitemapEntries();
  return [
    { url: siteUrl, lastModified: new Date() },
    ...blogs.map((blog) => ({
      url: `${siteUrl}/blog/${blog.slug}`,
      lastModified: new Date(blog.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
