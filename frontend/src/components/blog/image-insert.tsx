'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, HardDrive, ImageIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/axios';
import {
  cloudinaryThumbnailUrl,
  uploadsLibraryQueryKey,
  uploadsLibraryQueryOptions,
} from '@/lib/api/uploads.query';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

type ImageLibraryModalProps = {
  open: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
  title?: string;
};

export function ImageLibraryModal({
  open,
  onClose,
  onPick,
  title = 'Pick from media library',
}: ImageLibraryModalProps) {
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    ...uploadsLibraryQueryOptions({ limit: 48 }),
    enabled: open,
    placeholderData: (previous) => previous,
  });

  const showLoading = isLoading && !isPlaceholderData;

  const images = data?.items.filter((a) => a.resourceType === 'image') ?? [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-library-title"
    >
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="image-library-title" className="text-sm font-semibold text-card-foreground">
            {title}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-4">
          {isFetching && !showLoading ? (
            <p className="mb-2 text-xs text-muted-foreground">Refreshing library…</p>
          ) : null}
          {showLoading ? (
            <p className="text-sm text-muted-foreground">Loading library…</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No images in your library yet. Upload files under{' '}
              <span className="font-medium text-foreground">Dashboard → Files</span>, or choose
              &quot;From your device&quot; to upload a new image.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {images.map((asset) => (
                <button
                  key={asset.publicId}
                  type="button"
                  className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onPick(asset.url)}
                >
                  <img
                    src={cloudinaryThumbnailUrl(asset.url)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ImageSourceDialogProps = {
  open: boolean;
  onClose: () => void;
  onLibrary: () => void;
  onDevice: () => void;
};

function ImageSourceDialog({ open, onClose, onLibrary, onDevice }: ImageSourceDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-source-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="image-source-title" className="text-base font-semibold text-card-foreground">
          Insert image
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose an image from your media library or upload from your computer.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 justify-start gap-3"
            onClick={() => {
              onClose();
              onLibrary();
            }}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            From Files library
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 justify-start gap-3"
            onClick={() => {
              onClose();
              onDevice();
            }}
          >
            <HardDrive className="h-4 w-4 shrink-0" />
            From your device
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-4 w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

type EditorImageInsertProps = {
  onInsert: (url: string) => void;
  disabled?: boolean;
  /** Icon-only square button for the editor toolbar. */
  iconOnly?: boolean;
  /** Controlled open state for the source picker (e.g. slash command). */
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
};

/** Toolbar control: Image → library or device upload, then insert into editor. */
export function EditorImageInsert({
  onInsert,
  disabled,
  iconOnly,
  pickerOpen,
  onPickerOpenChange,
}: EditorImageInsertProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalSourceOpen, setInternalSourceOpen] = useState(false);
  const isControlled = onPickerOpenChange !== undefined;
  const sourceOpen = isControlled ? (pickerOpen ?? false) : internalSourceOpen;
  const setSourceOpen = (open: boolean) => {
    if (isControlled) onPickerOpenChange(open);
    else setInternalSourceOpen(open);
  };
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFromDevice = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.data?.url ?? data.url;
      if (!url) {
        throw new Error('No image URL returned');
      }
      onInsert(url);
      void queryClient.invalidateQueries({ queryKey: ['uploads', 'library'] });
      toast.success('Image inserted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Image upload failed. Check the file type and size.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFromDevice(file);
        }}
      />

      <ImageSourceDialog
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onLibrary={() => {
          void queryClient.prefetchQuery(uploadsLibraryQueryOptions({ limit: 48 }));
          setLibraryOpen(true);
        }}
        onDevice={() => fileInputRef.current?.click()}
      />

      <ImageLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Insert image from Files library"
        onPick={(url) => {
          onInsert(url);
          setLibraryOpen(false);
          toast.success('Image inserted');
        }}
      />

      <button
        type="button"
        title="Insert image"
        aria-label={uploading ? 'Uploading image' : 'Insert image'}
        disabled={disabled || uploading}
        onClick={() => setSourceOpen(true)}
        className={cn(
          iconOnly
            ? 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'
            : 'inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground hover:bg-accent disabled:opacity-50',
        )}
      >
        <ImageIcon className={iconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {!iconOnly ? (uploading ? 'Uploading…' : 'Image') : null}
      </button>
    </>
  );
}
