'use client';

import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorState } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react';
import type { BlogImageAlign, BlogImageWidth } from '@/components/blog/blog-image-extension';
import { ToolbarIconButton } from '@/components/blog/blog-editor-toolbar';
import { cn } from '@/lib/utils';

const WIDTH_PRESETS: { label: string; value: BlogImageWidth }[] = [
  { label: '25%', value: '25%' },
  { label: '50%', value: '50%' },
  { label: '75%', value: '75%' },
  { label: 'Full', value: '100%' },
];

type EditorImageBubbleMenuProps = {
  editor: Editor | null;
};

export function EditorImageBubbleMenu({ editor }: EditorImageBubbleMenuProps) {
  const imageState = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e?.isActive('image')) {
        return { active: false, align: 'center' as BlogImageAlign, width: '100%' as BlogImageWidth };
      }
      const attrs = e.getAttributes('image');
      return {
        active: true,
        align: (attrs.align as BlogImageAlign) || 'center',
        width: (attrs.width as BlogImageWidth) ?? '100%',
      };
    },
  });

  if (!editor) return null;

  const setAlign = (align: BlogImageAlign) => {
    editor.chain().focus().updateAttributes('image', { align }).run();
  };

  const setWidth = (width: BlogImageWidth) => {
    editor.chain().focus().updateAttributes('image', { width }).run();
  };

  const removeImage = () => {
    editor.chain().focus().deleteSelection().run();
  };

  const widthLabel = (value: BlogImageWidth) => {
    if (value === imageState?.width) return true;
    if (typeof value === 'string' && typeof imageState?.width === 'string') {
      return value === imageState.width;
    }
    return false;
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top' }}
      shouldShow={({ editor: e }) => e.isActive('image')}
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-md"
    >
      <ToolbarIconButton
        label="Align left (wrap text)"
        isActive={imageState?.align === 'left'}
        onClick={() => setAlign('left')}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Align center"
        isActive={imageState?.align === 'center'}
        onClick={() => setAlign('center')}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Align right (wrap text)"
        isActive={imageState?.align === 'right'}
        onClick={() => setAlign('right')}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarIconButton>

      <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />

      {WIDTH_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          title={`Width ${preset.label}`}
          onClick={() => setWidth(preset.value)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            widthLabel(preset.value) && 'bg-primary/10 text-primary',
          )}
        >
          {preset.label}
        </button>
      ))}

      <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />

      <ToolbarIconButton label="Remove image" onClick={removeImage}>
        <Trash2 className="h-4 w-4" />
      </ToolbarIconButton>
    </BubbleMenu>
  );
}
