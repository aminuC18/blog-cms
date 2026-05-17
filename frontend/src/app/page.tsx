import Link from 'next/link';
import { BlogCard } from '@/components/blog/BlogCard';
import { fetchPublicBlogs, fetchPublicTags } from '@/lib/api/public.api';
import { siteName } from '@/lib/utils';

export default async function HomePage() {
  const [{ items: blogs }, tags] = await Promise.all([
    fetchPublicBlogs({ page: 1, limit: 6 }),
    fetchPublicTags(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-12 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-8 py-14 text-primary-foreground">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-primary-foreground/70">Bespoke publishing</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          {siteName}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-primary-foreground/85">
          A modern editorial platform for long-form writing, review workflows, and polished public
          reading experiences.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex h-10 items-center rounded-lg bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
          >
            Explore stories
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg border border-primary-foreground/30 px-4 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Recent posts</h2>
            <p className="text-sm text-muted-foreground">Fresh writing from the editorial desk</p>
          </div>
          <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {blogs.map((blog) => (
            <BlogCard key={blog._id} blog={blog} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag._id}
              href={`/blog/tag/${tag.slug}`}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground hover:border-input hover:bg-accent"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
