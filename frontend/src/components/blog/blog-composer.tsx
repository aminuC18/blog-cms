'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadsLibraryQueryOptions } from '@/lib/api/uploads.query';
import { ChevronDown, FolderOpen, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { previewBlogSlug } from '@/lib/api/blogs.api';
import { fetchDashboardTags } from '@/lib/api/tags.api';
import { ImageLibraryModal } from '@/components/blog/image-insert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn, siteUrl } from '@/lib/utils';
import type { Tag } from '@/types/api.types';

export const BLOG_SUMMARY_MAX = 300;

export type AssetTarget = 'cover' | 'og';

type AssetPickerModalProps = {
  open: boolean;
  target: AssetTarget | null;
  onClose: () => void;
  onPick: (url: string, target: AssetTarget) => void;
};

export function AssetPickerModal({ open, target, onClose, onPick }: AssetPickerModalProps) {
  if (!target) return null;

  return (
    <ImageLibraryModal
      open={open}
      onClose={onClose}
      title={
        target === 'cover'
          ? 'Cover image — pick from library'
          : 'Open Graph image — pick from library'
      }
      onPick={(url) => onPick(url, target)}
    />
  );
}


export function BlogSlugPreview({
  title,
  excludeBlogId,
}: {
  title: string;
  excludeBlogId?: string;
}) {
  const debouncedTitle = useDebouncedValue(title, 400);
  const trimmed = debouncedTitle.trim();
  const liveTrimmed = title.trim();
  const { data: slug, isFetching } = useQuery({
    queryKey: ['blog-slug-preview', trimmed, excludeBlogId ?? ''],
    queryFn: () => previewBlogSlug(trimmed, excludeBlogId),
    enabled: trimmed.length > 0,
  });

  if (!title.trim()) {
    return (
      <p className="text-xs text-muted-foreground">
        Enter a title to preview the public URL. The slug is generated automatically and stays unique.
      </p>
    );
  }

  const waitingForDebounce = liveTrimmed !== trimmed;
  if (waitingForDebounce || (isFetching && !slug)) {
    return <p className="text-xs text-muted-foreground">Resolving slug…</p>;
  }

  if (!slug) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      Public URL:{' '}
      <span className="break-all font-mono text-foreground">
        {siteUrl}/blog/{slug}
      </span>
    </p>
  );
}

export function BlogTagPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', 'dashboard'],
    queryFn: fetchDashboardTags,
  });

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading tags…</p>;
  }
  if (tags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No tags exist yet. Admins can create tags under <span className="font-medium text-foreground">Tags</span>.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(tags as Tag[]).map((t) => (
        <button
          key={t._id}
          type="button"
          aria-pressed={value.includes(t._id)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition',
            value.includes(t._id)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
          onClick={() => toggle(t._id)}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

export function CoverImageField({
  id = 'coverImage',
  value,
  onChange,
  onOpenLibrary,
}: {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  onOpenLibrary: () => void;
}) {
  const queryClient = useQueryClient();
  const [loadError, setLoadError] = useState(false);
  const trimmed = value.trim();

  const handleOpenLibrary = () => {
    void queryClient.prefetchQuery(uploadsLibraryQueryOptions({ limit: 48 }));
    onOpenLibrary();
  };
  const showPreview = trimmed.length > 0 && !loadError;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          className="min-w-[12rem] flex-1"
          value={value}
          onChange={(e) => {
            setLoadError(false);
            onChange(e.target.value);
          }}
          placeholder="Paste a URL or pick from your media library"
        />
        <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1" onClick={handleOpenLibrary}>
          <FolderOpen className="h-4 w-4" />
          Library
        </Button>
      </div>

      {trimmed.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
          <p className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            Cover preview — how it appears on the published post
          </p>
          {showPreview ? (
            <img
              src={trimmed}
              alt="Cover preview"
              className="aspect-[2/1] w-full object-cover"
              onLoad={() => setLoadError(false)}
              onError={() => setLoadError(true)}
            />
          ) : (
            <div className="flex aspect-[2/1] flex-col items-center justify-center gap-2 bg-muted/50 text-muted-foreground">
              <ImageOff className="h-8 w-8 opacity-60" />
              <p className="text-sm">Could not load image. Check the URL.</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add a cover URL or pick from the library to see a live preview here and in{' '}
          <span className="font-medium text-foreground">Preview</span>.
        </p>
      )}
    </div>
  );
}

export function BlogSeoPanel({
  metaTitle,
  metaDescription,
  ogImage,
  defaultMetaTitle,
  defaultMetaDescription,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onOgImageChange,
  onOpenOgPicker,
}: {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  onMetaTitleChange: (v: string) => void;
  onMetaDescriptionChange: (v: string) => void;
  onOgImageChange: (v: string) => void;
  onOpenOgPicker: () => void;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card/50 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-card-foreground [&::-webkit-details-marker]:hidden">
        Search &amp; sharing (SEO)
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
        <p className="text-xs text-muted-foreground">
          Optional overrides. If left blank at publish time, the platform uses the post title and summary where
          appropriate.
        </p>
        <div className="space-y-2">
          <Label htmlFor="metaTitle">Meta title</Label>
          <Input
            id="metaTitle"
            value={metaTitle}
            placeholder={defaultMetaTitle || 'Defaults to post title'}
            onChange={(e) => onMetaTitleChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metaDescription">Meta description</Label>
          <Textarea
            id="metaDescription"
            value={metaDescription}
            placeholder={defaultMetaDescription || 'Defaults to summary'}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ogImage">Open Graph image URL</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="ogImage"
              className="min-w-[12rem] flex-1"
              value={ogImage}
              onChange={(e) => onOgImageChange(e.target.value)}
              placeholder="Defaults to cover image if empty"
            />
            <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1" onClick={onOpenOgPicker}>
              <FolderOpen className="h-4 w-4" />
              Library
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}
