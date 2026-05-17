import { BlogCard } from '@/components/blog/BlogCard';
import { fetchPublicBlogs } from '@/lib/api/public.api';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const { items } = await fetchPublicBlogs({ q, page: 1, limit: 12 });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Search</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {q ? `Results for "${q}"` : 'Browse published stories'}
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((blog) => (
          <BlogCard key={blog._id} blog={blog} />
        ))}
      </div>
    </main>
  );
}
