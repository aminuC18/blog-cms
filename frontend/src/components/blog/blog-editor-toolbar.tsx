'use client';

import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline,
  Unlink,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { EditorImageInsert } from '@/components/blog/image-insert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function useToolbarState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) {
        return {
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isH2: false,
          isH3: false,
          isBulletList: false,
          isOrderedList: false,
          isBlockquote: false,
          isCodeBlock: false,
          isLink: false,
        };
      }
      return {
        isBold: e.isActive('bold'),
        isItalic: e.isActive('italic'),
        isUnderline: e.isActive('underline'),
        isStrike: e.isActive('strike'),
        isH2: e.isActive('heading', { level: 2 }),
        isH3: e.isActive('heading', { level: 3 }),
        isBulletList: e.isActive('bulletList'),
        isOrderedList: e.isActive('orderedList'),
        isBlockquote: e.isActive('blockquote'),
        isCodeBlock: e.isActive('codeBlock'),
        isLink: e.isActive('link'),
      };
    },
  });
}

type ToolbarIconButtonProps = {
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

export function ToolbarIconButton({
  label,
  isActive,
  disabled,
  onClick,
  children,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        isActive && 'border-primary/30 bg-primary/10 text-primary',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />;
}

type FormatActionsProps = {
  editor: Editor;
  state: ReturnType<typeof useToolbarState>;
  onLink: () => void;
  onImageInsert?: (url: string) => void;
  imagePickerOpen?: boolean;
  onImagePickerOpenChange?: (open: boolean) => void;
  compact?: boolean;
};

function FormatActions({
  editor,
  state,
  onLink,
  onImageInsert,
  imagePickerOpen,
  onImagePickerOpenChange,
  compact,
}: FormatActionsProps) {
  const chain = () => editor.chain().focus();

  return (
    <div className={cn('flex flex-wrap items-center gap-0.5', compact && 'gap-0')}>
      <ToolbarIconButton
        label="Bold"
        isActive={state?.isBold}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Italic"
        isActive={state?.isItalic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Underline"
        isActive={state?.isUnderline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Strikethrough"
        isActive={state?.isStrike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarIconButton>

      {!compact ? <ToolbarDivider /> : null}

      <ToolbarIconButton
        label="Heading 2"
        isActive={state?.isH2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Heading 3"
        isActive={state?.isH3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarIconButton>

      {!compact ? <ToolbarDivider /> : null}

      <ToolbarIconButton
        label="Bullet list"
        isActive={state?.isBulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Numbered list"
        isActive={state?.isOrderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Quote"
        isActive={state?.isBlockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Code block"
        isActive={state?.isCodeBlock}
        onClick={() => chain().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label="Horizontal rule"
        onClick={() => chain().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolbarIconButton>

      {!compact ? <ToolbarDivider /> : null}

      <ToolbarIconButton label="Link" isActive={state?.isLink} onClick={onLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarIconButton>
      {state?.isLink ? (
        <ToolbarIconButton label="Remove link" onClick={() => chain().unsetLink().run()}>
          <Unlink className="h-4 w-4" />
        </ToolbarIconButton>
      ) : null}

      {onImageInsert && !compact ? (
        <EditorImageInsert
          onInsert={onImageInsert}
          iconOnly
          pickerOpen={imagePickerOpen}
          onPickerOpenChange={onImagePickerOpenChange}
        />
      ) : null}
    </div>
  );
}

type EditorToolbarProps = {
  editor: Editor | null;
  onImageInsert: (url: string) => void;
  onLink: () => void;
  imagePickerOpen?: boolean;
  onImagePickerOpenChange?: (open: boolean) => void;
};

export function EditorToolbar({
  editor,
  onImageInsert,
  onLink,
  imagePickerOpen,
  onImagePickerOpenChange,
}: EditorToolbarProps) {
  const state = useToolbarState(editor);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
      <FormatActions
        editor={editor}
        state={state}
        onLink={onLink}
        onImageInsert={onImageInsert}
        imagePickerOpen={imagePickerOpen}
        onImagePickerOpenChange={onImagePickerOpenChange}
      />
    </div>
  );
}

type EditorBubbleMenuProps = {
  editor: Editor | null;
  onLink: () => void;
};

export function EditorBubbleMenu({ editor, onLink }: EditorBubbleMenuProps) {
  const state = useToolbarState(editor);

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top' }}
      shouldShow={({ editor: e }) => {
        if (e.isActive('image')) return false;
        const { from, to } = e.state.selection;
        return from !== to;
      }}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-md"
    >
      <FormatActions editor={editor} state={state} onLink={onLink} compact />
    </BubbleMenu>
  );
}

type LinkEditorDialogProps = {
  open: boolean;
  editor: Editor;
  onClose: () => void;
};

export function LinkEditorDialog({ open, editor, onClose }: LinkEditorDialogProps) {
  const [url, setUrl] = useState('https://');

  useEffect(() => {
    if (!open) return;
    const href = editor.getAttributes('link').href as string | undefined;
    setUrl(href ?? 'https://');
  }, [open, editor]);

  if (!open) return null;

  const apply = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-editor-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="link-editor-title" className="text-base font-semibold text-card-foreground">
          Insert link
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select text first, then add a URL. Leave empty to remove the link.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="editor-link-url">URL</Label>
          <Input
            id="editor-link-url"
            type="url"
            value={url}
            placeholder="https://example.com"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                apply();
              }
            }}
            autoFocus
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
