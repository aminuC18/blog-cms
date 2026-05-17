export type BlogArticleViewProps = {
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  authorName?: string;
  metaLine?: string;
};

export function BlogArticleView({
  title,
  summary,
  content,
  coverImage,
  authorName,
  metaLine = 'Draft preview',
}: BlogArticleViewProps) {
  return (
    <article className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">{metaLine}</p>
        <h1 className="text-4xl font-semibold tracking-tight">{title || 'Untitled post'}</h1>
        {summary ? (
          <p className="text-lg text-muted-foreground">{summary}</p>
        ) : (
          <p className="text-lg italic text-muted-foreground/70">No summary yet</p>
        )}
        {authorName ? (
          <p className="text-sm text-muted-foreground">By {authorName}</p>
        ) : null}
      </div>
      {coverImage ? (
        <img
          src={coverImage}
          alt={title || 'Cover'}
          className="aspect-[2/1] w-full rounded-3xl object-cover"
        />
      ) : null}
      <div
        className="blog-prose prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content || '<p></p>' }}
      />
    </article>
  );
}
