import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogArticleView } from '@/components/blog/blog-article-view';
import { fetchPublicBlog } from '@/lib/api/public.api';
import { formatDate, siteName } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const blog = await fetchPublicBlog(slug);
    return {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.summary,
      openGraph: {
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.summary,
        images: blog.ogImage || blog.coverImage ? [{ url: blog.ogImage || blog.coverImage! }] : [],
        type: 'article',
        publishedTime: blog.publishedAt,
      },
    };
  } catch {
    return { title: siteName };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let blog;
  try {
    blog = await fetchPublicBlog(slug);
  } catch {
    notFound();
  }

  const metaLine = `${formatDate(blog.publishedAt)} · ${blog.readingTime} min read`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <BlogArticleView
        title={blog.title}
        summary={blog.summary}
        content={blog.content ?? ''}
        coverImage={blog.coverImage}
        authorName={blog.author?.name}
        metaLine={metaLine}
      />
    </main>
  );
}
