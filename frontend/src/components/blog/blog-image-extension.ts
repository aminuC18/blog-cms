import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BlogImageNodeView } from '@/components/blog/blog-image-node-view';

export type BlogImageAlign = 'left' | 'center' | 'right';

export type BlogImageWidth = number | string | null;

function widthToStyle(width: BlogImageWidth): string | undefined {
  if (width == null || width === '') return undefined;
  if (typeof width === 'number') return `${width}px`;
  return String(width);
}

function alignStyles(align: BlogImageAlign): string {
  switch (align) {
    case 'left':
      return 'float: left; margin: 0.25rem 1.25rem 1rem 0; max-width: 100%;';
    case 'right':
      return 'float: right; margin: 0.25rem 0 1rem 1.25rem; max-width: 100%;';
    default:
      return 'display: block; margin: 1rem auto; max-width: 100%;';
  }
}

export const BlogImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: '100%',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const attr = el.getAttribute('width') || el.getAttribute('data-width');
          if (attr) {
            const asNum = Number(attr);
            return Number.isFinite(asNum) ? asNum : attr;
          }
          const fromStyle = el.style.width;
          return fromStyle || '100%';
        },
        renderHTML: (attributes) => {
          const w = widthToStyle(attributes.width as BlogImageWidth);
          if (!w) return {};
          return { 'data-width': String(attributes.width), width: w };
        },
      },
      align: {
        default: 'center' as BlogImageAlign,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return (el.getAttribute('data-align') as BlogImageAlign) || 'center';
        },
        renderHTML: (attributes) => ({
          'data-align': attributes.align as BlogImageAlign,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes['data-align'] as BlogImageAlign) || 'center';
    const width = HTMLAttributes.width as string | undefined;
    const widthStyle = width ? `width: ${width}; height: auto;` : 'height: auto;';
    const style = `${widthStyle} ${alignStyles(align)}`.trim();

    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        class: 'blog-editor-image rounded-lg',
        style,
        draggable: 'false',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlogImageNodeView);
  },
});

