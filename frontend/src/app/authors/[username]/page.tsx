import { BlogCard } from '@/components/blog/BlogCard';
import {
  fetchPublicAuthor,
  fetchPublicAuthorBlogs,
} from '@/lib/api/public.api';

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [author, { items: blogs }] = await Promise.all([
    fetchPublicAuthor(username),
    fetchPublicAuthorBlogs(username),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-10 rounded-3xl border border-border bg-card p-8 text-card-foreground">
        <h1 className="text-3xl font-semibold">{author.name}</h1>
        <p className="mt-2 text-muted-foreground">{author.bio || 'Author profile'}</p>
      </section>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {blogs.map((blog) => (
          <BlogCard key={blog._id} blog={blog} />
        ))}
      </div>
    </main>
  );
}
