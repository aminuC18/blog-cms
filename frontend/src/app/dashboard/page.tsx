'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BlogTable } from '@/components/blog/BlogTable';
import { fetchDashboardBlogs } from '@/lib/api/blogs.api';

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchDashboardBlogs({ page: 1, limit: 100 }),
  });

  const blogs = data?.items ?? [];
  const published = blogs.filter((blog) => blog.status === 'PUBLISHED').length;
  const pending = blogs.filter((blog) => blog.status === 'SUBMITTED_FOR_REVIEW').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Editorial overview and workflow status</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total blogs" value={blogs.length} />
        <MetricCard title="Published" value={published} />
        <MetricCard title="Pending review" value={pending} />
      </div>
      <div className="flex justify-end">
        <Link
          href="/dashboard/blogs/new"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          New blog
        </Link>
      </div>
      <BlogTable />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
