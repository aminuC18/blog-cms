'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, LayoutGrid, List } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { fetchUploads, uploadDashboardFile, type UploadAsset } from '@/lib/api/uploads.api';
import { UPLOADS_LIBRARY_GC_MS, UPLOADS_LIBRARY_STALE_MS } from '@/lib/api/uploads.query';
import { getErrorMessage } from '@/lib/errors';

const VIEW_STORAGE_KEY = 'dashboard-files-view';

type FilesView = 'grid' | 'list';

function formatBytes(bytes?: number) {
  if (bytes == null || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${i === 0 ? v : v.toFixed(1)} ${units[i]}`;
}

export default function FilesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [view, setView] = useState<FilesView>('grid');
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') {
        setView(stored);
      }
      setPrefsReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view, prefsReady]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['uploads', 'library', 'infinite'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) =>
        fetchUploads({ cursor: pageParam, limit: 24 }),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: UPLOADS_LIBRARY_STALE_MS,
      gcTime: UPLOADS_LIBRARY_GC_MS,
    });

  const uploadMutation = useMutation({
    mutationFn: uploadDashboardFile,
    onSuccess: () => {
      toast.success('File uploaded to your library');
      void queryClient.invalidateQueries({ queryKey: ['uploads', 'library'] });
      if (inputRef.current) inputRef.current.value = '';
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Upload failed. Check the file type and size.')),
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <FolderOpen className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Media library</span>
          </div>
          <h1 className="text-3xl font-semibold">Files</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload and browse assets stored in your Cloudinary folder{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">blog/uploads</code>{' '}
            (or the folder set in <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">CLOUDINARY_UPLOAD_FOLDER</code>
            ). Copy URLs into blog content, cover images, or author profiles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-lg border border-border bg-muted/30 p-0.5"
            role="group"
            aria-label="Layout"
          >
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition',
                view === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-ring/30 [&_svg]:shrink-0 [&_svg]:text-primary-foreground'
                  : 'border border-transparent text-foreground hover:bg-accent [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
              )}
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition',
                view === 'list'
                  ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-ring/30 [&_svg]:shrink-0 [&_svg]:text-primary-foreground'
                  : 'border border-transparent text-foreground hover:bg-accent [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
              )}
              aria-pressed={view === 'list'}
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
          />
          <Button
            type="button"
            disabled={uploadMutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload file'}
          </Button>
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Could not load files. Check your Cloudinary credentials.</p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading files…</p>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((asset) => (
            <FileCard key={asset.publicId} asset={asset} onCopy={() => void copyUrl(asset.url)} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Public ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((asset) => (
                  <FileTableRow
                    key={asset.publicId}
                    asset={asset}
                    onCopy={() => void copyUrl(asset.url)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}

      {!isLoading && items.length === 0 && !isError ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No files yet. Upload an image or PDF to populate this folder in Cloudinary.
        </p>
      ) : null}
    </div>
  );
}

function FileTableRow({ asset, onCopy }: { asset: UploadAsset; onCopy: () => void }) {
  const isImage = asset.resourceType === 'image';

  return (
    <tr className="border-t border-border/60 transition hover:bg-accent/50">
      <td className="px-4 py-2">
        <div className="h-12 w-16 overflow-hidden rounded-md bg-muted">
          {isImage ? (
            <img
              src={asset.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
              {(asset.format ?? 'FILE').toUpperCase()}
            </div>
          )}
        </div>
      </td>
      <td className="max-w-[220px] px-4 py-2">
        <p className="truncate font-mono text-xs text-foreground" title={asset.publicId}>
          {asset.publicId}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{asset.resourceType}</td>
      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatBytes(asset.bytes)}</td>
      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDate(asset.createdAt)}</td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCopy}>
            Copy URL
          </Button>
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            Open
          </a>
        </div>
      </td>
    </tr>
  );
}

function FileCard({ asset, onCopy }: { asset: UploadAsset; onCopy: () => void }) {
  const isImage = asset.resourceType === 'image';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="aspect-video bg-muted">
        {isImage ? (
          <img src={asset.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
            <span className="text-2xl font-semibold text-muted-foreground">
              {(asset.format ?? 'FILE').toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">Raw file</span>
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate font-mono text-xs text-muted-foreground" title={asset.publicId}>
          {asset.publicId}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formatBytes(asset.bytes)}</span>
          <span>{formatDate(asset.createdAt)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCopy}>
            Copy URL
          </Button>
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            Open
          </a>
        </div>
      </div>
    </div>
  );
}
