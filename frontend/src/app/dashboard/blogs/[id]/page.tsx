'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import {
  approveBlog,
  fetchBlog,
  publishBlog,
  rejectBlog,
  reviewBlog,
  submitBlogForReview,
  unpublishBlog,
  updateBlog,
} from '@/lib/api/blogs.api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/hooks/useAuth';
import { siteUrl } from '@/lib/utils';
import type { Blog, BlogStatus, Role, Tag, User } from '@/types/api.types';

function authorId(blog: Blog): string {
  if (!blog.author) return '';
  if (typeof blog.author === 'object' && '_id' in blog.author) {
    return String(blog.author._id);
  }
  return String(blog.author);
}

function canActAsAdmin(role: Role) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function canActAsReviewer(role: Role) {
  return role === 'REVIEWER' || role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function tagIdsFromBlog(blog: Blog): string[] {
  return (blog.tags ?? [])
    .map((t) => (typeof t === 'object' && t && '_id' in t ? (t as Tag)._id : String(t)))
    .filter(Boolean);
}

/** Remount when `blog.version` bumps after save so local state matches the server without a sync effect. */
function EditBlogEditorShell({
  blog,
  user,
  onSaved,
}: {
  blog: Blog;
  user: User;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(blog.title);
  const [summary, setSummary] = useState(blog.summary);
  const [content, setContent] = useState(blog.content ?? '<p></p>');
  const [coverImage, setCoverImage] = useState(blog.coverImage ?? '');
  const [metaTitle, setMetaTitle] = useState(blog.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(blog.metaDescription ?? '');
  const [ogImage, setOgImage] = useState(blog.ogImage ?? '');
  const [tagIds, setTagIds] = useState<string[]>(() => tagIdsFromBlog(blog));
  const [slugField, setSlugField] = useState(blog.slug);
  const [assetTarget, setAssetTarget] = useState<AssetTarget | null>(null);

  const workflow = useMemo(() => {
    const aid = authorId(blog);
    const isOwn = aid !== '' && user._id === aid;
    const status = blog.status as BlogStatus;
    const admin = canActAsAdmin(user.role);
    const reviewer = canActAsReviewer(user.role);

    const showSubmit =
      (status === 'DRAFT' || status === 'REJECTED') && (isOwn || admin);

    const showReview = status === 'SUBMITTED_FOR_REVIEW' && reviewer;
    const showReject = status === 'SUBMITTED_FOR_REVIEW' && reviewer;

    const showApprove = status === 'REVIEWED' && admin;

    const showPublish = admin && (status === 'APPROVED' || status === 'UNPUBLISHED');

    const showUnpublish = status === 'PUBLISHED' && admin;

    return {
      showSubmit,
      showReview,
      showReject,
      showApprove,
      showPublish,
      showUnpublish,
    };
  }, [blog, user]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(label);
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, `${label} failed. Please try again.`));
    }
  };

  const save = async () => {
    if (summary.trim().length > BLOG_SUMMARY_MAX) {
      toast.error(`Summary must be at most ${BLOG_SUMMARY_MAX} characters.`);
      return;
    }
    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      content,
      coverImage: coverImage.trim(),
      tags: tagIds,
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      ogImage: ogImage.trim(),
      ...(blog.status !== 'PUBLISHED' ? { slug: slugField.trim() } : {}),
    };
    await run('Blog updated', () => updateBlog(blog._id, payload));
  };

  const hasWorkflowAction =
    workflow.showSubmit ||
    workflow.showReview ||
    workflow.showReject ||
    workflow.showApprove ||
    workflow.showPublish ||
    workflow.showUnpublish;

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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Edit blog</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Public URL:{' '}
              <span className="font-mono text-foreground">
                {siteUrl}/blog/{slugField}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BlogPreviewButton
              draft={{
                title,
                summary,
                content,
                coverImage: coverImage || undefined,
                authorName: user.name,
              }}
            />
            <StatusBadge status={blog.status} />
          </div>
        </div>

        {hasWorkflowAction ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <h2 className="text-sm font-semibold text-card-foreground">Editorial workflow</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Actions depend on your role and this post&apos;s status. Approve appears only for admins
              when the post is reviewed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflow.showSubmit ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    void run('Submitted for review', () => submitBlogForReview(blog._id))
                  }
                >
                  Submit for review
                </Button>
              ) : null}
              {workflow.showReview ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const notes = window.prompt('Optional review notes for the author:', '') ?? '';
                    void run('Marked as reviewed', () => reviewBlog(blog._id, notes));
                  }}
                >
                  Mark reviewed
                </Button>
              ) : null}
              {workflow.showReject ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const reason = window.prompt('Rejection reason (required):', '');
                    if (!reason?.trim()) {
                      toast.error('A rejection reason is required.');
                      return;
                    }
                    void run('Post rejected', () => rejectBlog(blog._id, reason.trim()));
                  }}
                >
                  Reject
                </Button>
              ) : null}
              {workflow.showApprove ? (
                <Button
                  type="button"
                  variant="success"
                  onClick={() => void run('Post approved', () => approveBlog(blog._id))}
                >
                  Approve
                </Button>
              ) : null}
              {workflow.showPublish ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void run('Post published', () => publishBlog(blog._id))}
                >
                  Publish now
                </Button>
              ) : null}
              {workflow.showUnpublish ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void run('Post unpublished', () => unpublishBlog(blog._id))}
                >
                  Unpublish
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!hasWorkflowAction && blog.status !== 'PUBLISHED' ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No workflow actions are available for your role in this status. Authors use{' '}
            <strong>Submit for review</strong> from draft; reviewers and admins act when the post is
            submitted or reviewed.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        {blog.status !== 'PUBLISHED' ? (
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              className="font-mono text-sm"
              value={slugField}
              onChange={(event) => setSlugField(event.target.value)}
            />
            <BlogSlugPreview title={title} excludeBlogId={blog._id} />
            <p className="text-xs text-muted-foreground">
              The saved slug is controlled above. The preview shows what a <em>new</em> post would get from the
              current title (excluding this post), useful if you clear the slug to regenerate.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={summary}
            maxLength={BLOG_SUMMARY_MAX}
            rows={4}
            onChange={(event) => setSummary(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {summary.length}/{BLOG_SUMMARY_MAX} characters
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

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void save()}>
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

export default function EditBlogPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: blog, refetch } = useQuery({
    queryKey: ['blog', params.id],
    queryFn: () => fetchBlog(params.id),
  });

  if (!blog || !user) {
    return <p className="text-sm text-muted-foreground">Loading blog...</p>;
  }

  const versionKey = blog.version ?? 1;

  return (
    <EditBlogEditorShell
      key={`${blog._id}-v${versionKey}`}
      blog={blog}
      user={user}
      onSaved={() => void refetch()}
    />
  );
}
