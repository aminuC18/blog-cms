'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { BlogEditor } from '@/components/blog/BlogEditor';
import {
  AssetPickerModal,
  BlogSeoPanel,
  BlogSlugPreview,
  BlogTagPicker,
  BLOG_SUMMARY_MAX,
  CoverImageField,
  type AssetTarget,
} from '@/components/blog/blog-composer';
import { BlogPreviewButton } from '@/components/blog/blog-post-preview';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { createBlog } from '@/lib/api/blogs.api';
import { getErrorMessage } from '@/lib/errors';

export default function NewBlogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('<p></p>');
  const [coverImage, setCoverImage] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assetTarget, setAssetTarget] = useState<AssetTarget | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (summary.trim().length > BLOG_SUMMARY_MAX) {
      toast.error(`Summary must be at most ${BLOG_SUMMARY_MAX} characters.`);
      return;
    }
    setLoading(true);
    try {
      const blog = await createBlog({
        title: title.trim(),
        summary: summary.trim(),
        content,
        coverImage: coverImage.trim() || undefined,
        tags: tagIds.length ? tagIds : undefined,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        ogImage: ogImage.trim() || undefined,
      });
      toast.success('Blog created');
      router.push(`/dashboard/blogs/${blog._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'We could not create this blog. Please review the form and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AssetPickerModal
        open={assetTarget !== null}
        target={assetTarget}
        onClose={() => setAssetTarget(null)}
        onPick={(url, target) => {
          if (target === 'cover') setCoverImage(url);
          else setOgImage(url);
          setAssetTarget(null);
        }}
      />
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Create blog</h1>
            <p className="text-sm text-muted-foreground">
              Draft content, assign tags, set cover and SEO, then save. Submit for review from the edit screen.
            </p>
          </div>
          <BlogPreviewButton
            draft={{
              title,
              summary,
              content,
              coverImage: coverImage || undefined,
              authorName: user?.name,
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <BlogSlugPreview title={title} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            maxLength={BLOG_SUMMARY_MAX}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {summary.length}/{BLOG_SUMMARY_MAX} characters (used for listings and default meta description)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <BlogTagPicker value={tagIds} onChange={setTagIds} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverImage">Cover image</Label>
          <CoverImageField
            value={coverImage}
            onChange={setCoverImage}
            onOpenLibrary={() => setAssetTarget('cover')}
          />
        </div>

        <BlogSeoPanel
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          ogImage={ogImage}
          defaultMetaTitle={title}
          defaultMetaDescription={summary}
          onMetaTitleChange={setMetaTitle}
          onMetaDescriptionChange={setMetaDescription}
          onOgImageChange={setOgImage}
          onOpenOgPicker={() => setAssetTarget('og')}
        />

        <div className="space-y-2">
          <Label>Body</Label>
          <BlogEditor value={content} onChange={setContent} />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save draft'}
        </Button>
      </form>
    </>
  );
}
