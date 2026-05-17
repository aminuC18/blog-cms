import { BlogTable } from '@/components/blog/BlogTable';

export default function DashboardBlogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Blogs</h1>
        <p className="text-sm text-muted-foreground">Manage drafts, reviews, and publishing actions.</p>
      </div>
      <BlogTable />
    </div>
  );
}
