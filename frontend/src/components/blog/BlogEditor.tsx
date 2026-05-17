'use client';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import { BlogImage } from '@/components/blog/blog-image-extension';
import { EditorImageBubbleMenu } from '@/components/blog/editor-image-bubble-menu';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { useEffect, useState } from 'react';
import { EditorSlashMenu } from '@/components/blog/blog-editor-slash-menu';
import {
  EditorBubbleMenu,
  EditorToolbar,
  LinkEditorDialog,
} from '@/components/blog/blog-editor-toolbar';

const lowlight = createLowlight(common);

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function BlogEditor({ value, onChange }: BlogEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2',
        },
      }),
      BlogImage,
      Placeholder.configure({
        placeholder: 'Write your story… Type / for blocks (headings, lists, images).',
      }),
      CharacterCount,
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'blog-prose prose prose-neutral max-w-none dark:prose-invert min-h-[320px] px-4 py-3 text-foreground focus:outline-none prose-headings:scroll-mt-20 prose-a:text-primary prose-pre:bg-muted prose-pre:text-foreground [&_.blog-image-node]:my-3',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const insertImage = (url: string) => {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: { src: url, align: 'center', width: '100%' },
      })
      .run();
  };

  const openLink = () => setLinkOpen(true);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-input bg-background shadow-sm">
        <EditorToolbar
          editor={editor}
          onImageInsert={insertImage}
          onLink={openLink}
          imagePickerOpen={imagePickerOpen}
          onImagePickerOpenChange={setImagePickerOpen}
        />
        <div className="relative">
          {editor ? (
            <>
              <EditorBubbleMenu editor={editor} onLink={openLink} />
              <EditorImageBubbleMenu editor={editor} />
              <EditorSlashMenu editor={editor} onImageRequest={() => setImagePickerOpen(true)} />
              <LinkEditorDialog
                open={linkOpen}
                editor={editor}
                onClose={() => setLinkOpen(false)}
              />
            </>
          ) : null}
          <EditorContent editor={editor} />
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          <span>WYSIWYG — formatting matches the published post</span>
          <span>{editor?.storage.characterCount.characters() ?? 0} characters</span>
        </div>
      </div>
    </div>
  );
}
