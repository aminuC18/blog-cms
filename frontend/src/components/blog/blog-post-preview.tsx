'use client';

import { Eye, X } from 'lucide-react';
import { useState } from 'react';
import { BlogArticleView } from '@/components/blog/blog-article-view';
import { Button } from '@/components/ui/button';
import { estimateReadingMinutes } from '@/lib/blog-content';
import { cn } from '@/lib/utils';

export type BlogPreviewDraft = {
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  authorName?: string;
};

type BlogPostPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  draft: BlogPreviewDraft;
};

export function BlogPostPreviewModal({ open, onClose, draft }: BlogPostPreviewModalProps) {
  if (!open) return null;

  const minutes = estimateReadingMinutes(draft.content);
  const metaLine = `Preview · ${minutes} min read`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blog-preview-title"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="blog-preview-title" className="text-sm font-semibold text-foreground">
            Post preview
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Unpublished
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto max-w-3xl px-6 py-12">
          <BlogArticleView
            title={draft.title}
            summary={draft.summary}
            content={draft.content}
            coverImage={draft.coverImage?.trim() || undefined}
            authorName={draft.authorName}
            metaLine={metaLine}
          />
        </main>
      </div>
    </div>
  );
}

type BlogPreviewButtonProps = {
  draft: BlogPreviewDraft;
  className?: string;
};

export function BlogPreviewButton({ draft, className }: BlogPreviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        <Eye className="mr-1.5 h-4 w-4" />
        Preview
      </Button>
      <BlogPostPreviewModal open={open} onClose={() => setOpen(false)} draft={draft} />
    </>
  );
}
