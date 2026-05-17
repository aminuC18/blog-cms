'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { fetchDashboardBlogs } from '@/lib/api/blogs.api';
import { formatRelativeDate } from '@/lib/utils';
import type { Blog } from '@/types/api.types';

export function BlogTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-blogs'],
    queryFn: () => fetchDashboardBlogs({ page: 1, limit: 20 }),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading blogs...</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="min-w-full text-left text-sm text-card-foreground">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Author</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Views</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((blog: Blog) => (
            <tr key={blog._id} className="border-t border-border/60">
              <td className="px-4 py-3 font-medium text-foreground">{blog.title}</td>
              <td className="px-4 py-3">{blog.author?.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={blog.status} />
              </td>
              <td className="px-4 py-3">{blog.viewCount ?? 0}</td>
              <td className="px-4 py-3">{formatRelativeDate(blog.createdAt)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/blogs/${blog._id}`}
                  className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
