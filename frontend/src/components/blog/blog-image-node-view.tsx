'use client';

import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useRef } from 'react';
import type { BlogImageAlign, BlogImageWidth } from '@/components/blog/blog-image-extension';
import { cn } from '@/lib/utils';

function resolveWidth(width: BlogImageWidth): string {
  if (width == null || width === '') return '100%';
  if (typeof width === 'number') return `${width}px`;
  return String(width);
}

export function BlogImageNodeView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const align = (node.attrs.align as BlogImageAlign) || 'center';
  const width = resolveWidth(node.attrs.width as BlogImageWidth);
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || '';

  const selectImage = useCallback(() => {
    const pos = getPos();
    if (typeof pos === 'number') {
      editor.commands.setNodeSelection(pos);
    }
  }, [editor, getPos]);

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      selectImage();

      const startX = event.clientX;
      const startWidth = wrapperRef.current?.offsetWidth ?? 320;
      const proseRoot = wrapperRef.current?.closest('.ProseMirror');
      const maxWidth = proseRoot?.clientWidth ?? 800;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const next = Math.round(Math.max(120, Math.min(maxWidth, startWidth + delta)));
        updateAttributes({ width: next });
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [selectImage, updateAttributes],
  );

  const wrapperClass = cn(
    'blog-image-node not-prose relative my-3 max-w-full',
    align === 'left' && 'float-left mr-5 mb-4',
    align === 'right' && 'float-right ml-5 mb-4',
    align === 'center' && 'mx-auto block',
    selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg',
  );

  return (
    <NodeViewWrapper
      as="div"
      className={wrapperClass}
      style={{ width }}
      contentEditable={false}
      onClick={selectImage}
    >
      <div ref={wrapperRef} className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block h-auto w-full rounded-lg object-cover"
          draggable={false}
        />
        {selected ? (
          <button
            type="button"
            aria-label="Resize image"
            className="absolute bottom-1 right-1 z-10 h-4 w-4 cursor-se-resize rounded-sm border-2 border-background bg-primary shadow-sm"
            onMouseDown={startResize}
          />
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}
