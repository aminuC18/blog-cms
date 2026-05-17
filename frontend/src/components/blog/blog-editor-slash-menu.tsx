'use client';

import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type SlashItem = {
  id: string;
  label: string;
  hint: string;
  run: (editor: Editor) => void;
};

const BASE_ITEMS: SlashItem[] = [
  {
    id: 'paragraph',
    label: 'Text',
    hint: 'Plain paragraph',
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'Section title',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'Subsection',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    hint: 'Unordered list',
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Numbered list',
    hint: 'Ordered list',
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'Blockquote',
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Code block',
    hint: 'Syntax-highlighted code',
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'hr',
    label: 'Divider',
    hint: 'Horizontal rule',
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

const IMAGE_ITEM: SlashItem = {
  id: 'image',
  label: 'Image',
  hint: 'Library or device upload',
  run: () => {},
};

function getSlashQuery(editor: Editor): { query: string; from: number } | null {
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock) return null;

  const blockStart = $from.start();
  const text = editor.state.doc.textBetween(blockStart, $from.pos, '\n', '\n');
  const match = text.match(/(?:^|\s)\/([a-z0-9]*)$/i);
  if (!match) return null;

  const query = match[1] ?? '';
  const slashIndex = text.lastIndexOf(`/${query}`);
  const from = blockStart + slashIndex;

  return { query: query.toLowerCase(), from };
}

function matchesQuery(item: SlashItem, query: string) {
  if (!query) return true;
  return (
    item.label.toLowerCase().includes(query) ||
    item.id.includes(query) ||
    item.hint.toLowerCase().includes(query)
  );
}

type EditorSlashMenuProps = {
  editor: Editor | null;
  onImageRequest?: () => void;
};

export function EditorSlashMenu({ editor, onImageRequest }: EditorSlashMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [slashFrom, setSlashFrom] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const allItems = useMemo(
    () => (onImageRequest ? [...BASE_ITEMS, IMAGE_ITEM] : BASE_ITEMS),
    [onImageRequest],
  );

  const filtered = useMemo(
    () => allItems.filter((item) => matchesQuery(item, query)),
    [allItems, query],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const applyItem = useCallback(
    (item: SlashItem) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: slashFrom, to: from }).run();

      if (item.id === 'image') {
        onImageRequest?.();
      } else {
        item.run(editor);
      }
      close();
    },
    [editor, slashFrom, close, onImageRequest],
  );

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const match = getSlashQuery(editor);
      if (!match) {
        close();
        return;
      }

      setQuery(match.query);
      setSlashFrom(match.from);
      setOpen(true);
      setActiveIndex(0);

      const coordsAt = editor.view.coordsAtPos(match.from);
      setCoords({
        top: coordsAt.bottom + 8,
        left: coordsAt.left,
      });
    };

    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor, close]);

  useEffect(() => {
    if (!editor || !open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        applyItem(filtered[activeIndex]!);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [editor, open, filtered, activeIndex, applyItem, close]);

  if (!open || !editor || filtered.length === 0) return null;

  return (
    <div
      className="fixed z-50 min-w-[220px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
      style={{ top: coords.top, left: coords.left }}
      role="listbox"
    >
      <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Insert block
      </p>
      {filtered.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={cn(
            'flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors',
            index === activeIndex && 'bg-accent text-accent-foreground',
          )}
          onMouseEnter={() => setActiveIndex(index)}
          onMouseDown={(e) => {
            e.preventDefault();
            applyItem(item);
          }}
        >
          <span className="font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
