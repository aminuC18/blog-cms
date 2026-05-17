import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { Blog } from '@/types/api.types';

export function BlogCard({ blog }: { blog: Blog }) {
  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/blog/${blog.slug}`} className="block text-card-foreground no-underline">
        {blog.coverImage ? (
          <div
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url(${blog.coverImage})` }}
          />
        ) : (
          <div className="h-48 bg-gradient-to-br from-muted to-muted/80" />
        )}
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {formatDate(blog.publishedAt ?? blog.createdAt)}
            </p>
            {blog.readingTime ? <p className="text-xs text-muted-foreground">{blog.readingTime} min read</p> : null}
          </div>
          <h3 className="text-xl font-semibold text-card-foreground">{blog.title}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{blog.summary}</p>
          <div className="flex flex-wrap gap-2">
            {blog.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag._id}
                className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">By {blog.author?.name ?? 'Unknown'}</p>
            <StatusBadge status={blog.status} />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
