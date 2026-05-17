'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiUrl, cn } from '@/lib/utils';

type TocItem = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

const DOC_TOC: TocItem[] = [
  { id: 'overview', label: 'Overview' },
  {
    id: 'auth',
    label: 'Authentication',
    children: [
      { id: 'auth-ip-whitelist', label: 'IP whitelist' },
      { id: 'auth-key-rotation', label: 'Key rotation' },
    ],
  },
  {
    id: 'responses',
    label: 'Response format',
    children: [
      { id: 'responses-success-single', label: 'Success (single)' },
      { id: 'responses-success-paginated', label: 'Success (paginated)' },
      { id: 'responses-error', label: 'Error' },
    ],
  },
  {
    id: 'endpoints',
    label: 'Endpoints',
    children: [
      { id: 'endpoint-list-blogs', label: 'List posts' },
      { id: 'endpoint-get-blog', label: 'Get post' },
      { id: 'endpoint-list-tags', label: 'List tags' },
      { id: 'endpoint-posts-by-tag', label: 'Posts by tag' },
    ],
  },
  { id: 'errors', label: 'Errors' },
];

function DocSubheading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-sm font-semibold text-foreground">
      {children}
    </h3>
  );
}

function DocsTableOfContents({
  activeId,
  className,
}: {
  activeId: string;
  className?: string;
}) {
  return (
    <nav aria-label="Table of contents" className={cn('text-sm', className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {DOC_TOC.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block border-l-2 py-1 pl-3 -ml-px transition-colors hover:text-foreground',
                activeId === item.id
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground',
              )}
            >
              {item.label}
            </a>
            {item.children?.length ? (
              <ul className="mt-0.5 space-y-0.5 pb-1">
                {item.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className={cn(
                        'block border-l-2 py-0.5 pl-5 -ml-px text-xs transition-colors hover:text-foreground',
                        activeId === child.id
                          ? 'border-primary font-medium text-foreground'
                          : 'border-transparent text-muted-foreground',
                      )}
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText ?? children);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="relative rounded-lg border border-border bg-muted/40">
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-8 w-8 p-0"
        onClick={() => void copy()}
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-4 text-sm text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:leading-relaxed [&_strong]:text-foreground [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-foreground">
        {children}
      </div>
    </section>
  );
}

const baseUrl = apiUrl.replace(/\/$/, '');

const TOC_IDS = DOC_TOC.flatMap((item) => [
  item.id,
  ...(item.children?.map((c) => c.id) ?? []),
]);

export function PublicApiDocs() {
  const exampleKey = 'bk_your_api_key_here';
  const [activeId, setActiveId] = useState('overview');

  useEffect(() => {
    const elements = TOC_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Public API documentation</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Read-only HTTP API for published blog content. Use it to power mobile apps, partner sites, or
          internal tools. Generate keys and optional IP rules in{' '}
          <Link href="/dashboard/settings" className="font-medium text-primary underline-offset-2 hover:underline">
            API settings
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 lg:hidden">
        <DocsTableOfContents activeId={activeId} />
      </div>

      <div className="flex items-start gap-10 lg:gap-14">
        <div className="min-w-0 flex-1 space-y-8">
      <DocSection id="overview" title="Overview">
        <p>
          <strong>Base URL:</strong> <code>{baseUrl}</code>
        </p>
        <p>
          All external routes live under <code>/v1/blogs</code>. Only <strong>published</strong> posts are
          returned. Drafts, scheduled, and workflow states are never exposed.
        </p>
        <p>
          The website’s public routes (<code>/api/public/…</code>) do not require an API key. The v1 API
          documented here is intended for authenticated integrations.
        </p>
      </DocSection>

      <DocSection id="auth" title="Authentication">
        <p>
          Every request must include your API key in the <code>x-api-key</code> header:
        </p>
        <CodeBlock copyText={`x-api-key: ${exampleKey}`}>{`x-api-key: ${exampleKey}`}</CodeBlock>
        <DocSubheading id="auth-ip-whitelist">IP whitelist (optional)</DocSubheading>
        <p>
          If your organization configures IP rules in API settings, requests must come from an allowed IP
          or CIDR. With no rules configured, any IP may call the API with a valid key.
        </p>
        <DocSubheading id="auth-key-rotation">Key rotation</DocSubheading>
        <p>
          Only one API key is active at a time. Generating a new key in the dashboard revokes the previous
          key immediately.
        </p>
      </DocSection>

      <DocSection id="responses" title="Response format">
        <p>All responses are JSON with <code>Content-Type: application/json</code>.</p>

        <DocSubheading id="responses-success-single">
          Success — single resource or array (no pagination)
        </DocSubheading>
        <p>
          Used by <code>GET /v1/blogs/:slug</code> and <code>GET /v1/blogs/tags</code>. There is no{' '}
          <code>meta</code> field.
        </p>
        <CodeBlock>{`{
  "success": true,
  "data": { },
  "message": "Operation successful"
}`}</CodeBlock>
        <p>
          For <code>GET /v1/blogs/tags</code>, <code>data</code> is an <strong>array</strong> of tag objects.
          For <code>GET /v1/blogs/:slug</code>, <code>data</code> is a single blog object (includes{' '}
          <code>content</code>).
        </p>

        <DocSubheading id="responses-success-paginated">Success — paginated list</DocSubheading>
        <p>
          Used by <code>GET /v1/blogs</code> and <code>GET /v1/blogs/tags/:slug</code>.{' '}
          <code>data</code> is an array of blog summaries; <code>meta</code> describes pagination.
        </p>
        <CodeBlock>{`{
  "success": true,
  "data": [ /* blog objects — no content field */ ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "message": "Operation successful"
}`}</CodeBlock>

        <DocSubheading id="responses-error">Error</DocSubheading>
        <p>HTTP status matches the error (4xx / 5xx). Body shape:</p>
        <CodeBlock>{`{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or missing x-api-key header",
  "errors": [
    { "field": "limit", "message": "Limit: must not be greater than 50" }
  ]
}`}</CodeBlock>
        <p>
          <code>errors</code> is only present for validation failures (e.g. invalid query params). For most
          auth and not-found errors, only <code>message</code> is returned.
        </p>
      </DocSection>

      <DocSection id="endpoints" title="Endpoints">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="text-sm">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr>
                <td>
                  <code>GET</code>
                </td>
                <td>
                  <code>/v1/blogs</code>
                </td>
                <td>List published posts (paginated)</td>
              </tr>
              <tr>
                <td>
                  <code>GET</code>
                </td>
                <td>
                  <code>/v1/blogs/:slug</code>
                </td>
                <td>Single post with full HTML content</td>
              </tr>
              <tr>
                <td>
                  <code>GET</code>
                </td>
                <td>
                  <code>/v1/blogs/tags</code>
                </td>
                <td>All tags</td>
              </tr>
              <tr>
                <td>
                  <code>GET</code>
                </td>
                <td>
                  <code>/v1/blogs/tags/:slug</code>
                </td>
                <td>Posts filtered by tag slug</td>
              </tr>
            </tbody>
          </table>
        </div>

        <DocSubheading id="endpoint-list-blogs">List posts — GET /v1/blogs</DocSubheading>
        <p>Query parameters (all optional):</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="text-sm">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr>
                <td>
                  <code>page</code>
                </td>
                <td>number</td>
                <td>Page number (default 1)</td>
              </tr>
              <tr>
                <td>
                  <code>limit</code>
                </td>
                <td>number</td>
                <td>Items per page, 1–50 (default 10)</td>
              </tr>
              <tr>
                <td>
                  <code>tag</code>
                </td>
                <td>string</td>
                <td>Filter by tag slug</td>
              </tr>
              <tr>
                <td>
                  <code>author</code>
                </td>
                <td>string</td>
                <td>Filter by author username</td>
              </tr>
              <tr>
                <td>
                  <code>q</code>
                </td>
                <td>string</td>
                <td>Full-text search</td>
              </tr>
              <tr>
                <td>
                  <code>sort</code>
                </td>
                <td>string</td>
                <td>
                  <code>publishedAt:desc</code> (default), <code>publishedAt:asc</code>,{' '}
                  <code>viewCount:desc</code>, <code>title:asc</code>, <code>title:desc</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <CodeBlock
          copyText={`curl -s -H "x-api-key: ${exampleKey}" "${baseUrl}/v1/blogs?page=1&limit=10&sort=publishedAt:desc"`}
        >{`curl -s -H "x-api-key: ${exampleKey}" \\
  "${baseUrl}/v1/blogs?page=1&limit=10&sort=publishedAt:desc"`}</CodeBlock>
        <p className="font-medium text-foreground">Example response (200)</p>
        <CodeBlock>{`{
  "success": true,
  "data": [
    {
      "_id": "664a1b2c3d4e5f6789012345",
      "title": "Hello world",
      "slug": "hello-world",
      "summary": "Short excerpt shown in listings.",
      "coverImage": "https://res.cloudinary.com/.../cover.jpg",
      "images": [],
      "tags": [
        { "_id": "...", "name": "News", "slug": "news", "color": "#64748b" }
      ],
      "status": "PUBLISHED",
      "author": {
        "_id": "...",
        "name": "Jane Doe",
        "username": "jane",
        "avatarUrl": "https://..."
      },
      "publishedAt": "2026-05-01T12:00:00.000Z",
      "metaTitle": "",
      "metaDescription": "",
      "ogImage": "",
      "readingTime": 5,
      "viewCount": 120,
      "commentCount": 3,
      "createdAt": "2026-04-20T08:00:00.000Z",
      "updatedAt": "2026-05-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "message": "Operation successful"
}`}</CodeBlock>
        <p>
          <code>content</code> is <strong>not</strong> included in list items. Use{' '}
          <code>GET /v1/blogs/:slug</code> for the HTML body.
        </p>

        <DocSubheading id="endpoint-get-blog">Get post — GET /v1/blogs/:slug</DocSubheading>
        <p>
          Returns one published post. <code>content</code> is HTML from the editor.{' '}
          <code>viewCount</code> is incremented on each successful request.
        </p>
        <CodeBlock
          copyText={`curl -s -H "x-api-key: ${exampleKey}" "${baseUrl}/v1/blogs/my-post-slug"`}
        >{`curl -s -H "x-api-key: ${exampleKey}" \\
  "${baseUrl}/v1/blogs/my-post-slug"`}</CodeBlock>
        <p className="font-medium text-foreground">Example response (200)</p>
        <CodeBlock>{`{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6789012345",
    "title": "Hello world",
    "slug": "hello-world",
    "summary": "Short excerpt shown in listings.",
    "content": "<p>Full post HTML…</p>",
    "coverImage": "https://res.cloudinary.com/.../cover.jpg",
    "images": [],
    "tags": [
      { "_id": "...", "name": "News", "slug": "news", "color": "#64748b" }
    ],
    "status": "PUBLISHED",
    "author": {
      "_id": "...",
      "name": "Jane Doe",
      "username": "jane",
      "avatarUrl": "https://...",
      "bio": "Writer and editor.",
      "socialLinks": { "twitter": "https://..." }
    },
    "publishedAt": "2026-05-01T12:00:00.000Z",
    "metaTitle": "Hello world | My Blog",
    "metaDescription": "SEO description",
    "ogImage": "https://...",
    "readingTime": 5,
    "viewCount": 121,
    "commentCount": 3,
    "createdAt": "2026-04-20T08:00:00.000Z",
    "updatedAt": "2026-05-01T12:00:00.000Z"
  },
  "message": "Operation successful"
}`}</CodeBlock>

        <DocSubheading id="endpoint-list-tags">List tags — GET /v1/blogs/tags</DocSubheading>
        <CodeBlock copyText={`curl -s -H "x-api-key: ${exampleKey}" "${baseUrl}/v1/blogs/tags"`}>
          {`curl -s -H "x-api-key: ${exampleKey}" \\
  "${baseUrl}/v1/blogs/tags"`}
        </CodeBlock>
        <p className="font-medium text-foreground">Example response (200)</p>
        <CodeBlock>{`{
  "success": true,
  "data": [
    {
      "_id": "664a1b2c3d4e5f678901234a",
      "name": "Engineering",
      "slug": "engineering",
      "description": "Technical posts",
      "color": "#3b82f6",
      "blogCount": 12,
      "createdAt": "2026-01-10T10:00:00.000Z",
      "updatedAt": "2026-04-01T14:30:00.000Z"
    }
  ],
  "message": "Operation successful"
}`}</CodeBlock>

        <DocSubheading id="endpoint-posts-by-tag">Posts by tag — GET /v1/blogs/tags/:slug</DocSubheading>
        <p>
          Same paginated envelope as <code>GET /v1/blogs</code> (array in <code>data</code> +{' '}
          <code>meta</code>). Query params: <code>page</code>, <code>limit</code>, <code>sort</code> (not{' '}
          <code>tag</code> — the tag comes from the URL).
        </p>
        <CodeBlock
          copyText={`curl -s -H "x-api-key: ${exampleKey}" "${baseUrl}/v1/blogs/tags/engineering?page=1&limit=10"`}
        >{`curl -s -H "x-api-key: ${exampleKey}" \\
  "${baseUrl}/v1/blogs/tags/engineering?page=1&limit=10"`}</CodeBlock>
      </DocSection>

      <DocSection id="errors" title="Errors">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="text-sm">
            <thead>
              <tr>
                <th>HTTP status</th>
                <th>Typical message</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr>
                <td>
                  <code>401</code>
                </td>
                <td>
                  <code>Invalid or missing x-api-key header</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>401</code>
                </td>
                <td>
                  <code>Public API access is not configured. Generate an API key under Dashboard → API settings.</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>403</code>
                </td>
                <td>
                  <code>Request IP is not allowed for this API</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>404</code>
                </td>
                <td>
                  <code>Blog not found</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>400</code>
                </td>
                <td>Validation — includes <code>errors</code> array</td>
              </tr>
              <tr>
                <td>
                  <code>500</code>
                </td>
                <td>Server error</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="font-medium text-foreground">Example — 401</p>
        <CodeBlock>{`{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or missing x-api-key header"
}`}</CodeBlock>
        <p className="font-medium text-foreground">Example — 403</p>
        <CodeBlock>{`{
  "success": false,
  "statusCode": 403,
  "message": "Request IP is not allowed for this API"
}`}</CodeBlock>
        <p className="font-medium text-foreground">Example — 404</p>
        <CodeBlock>{`{
  "success": false,
  "statusCode": 404,
  "message": "Blog not found"
}`}</CodeBlock>
      </DocSection>
        </div>

        <aside className="hidden w-52 shrink-0 lg:block xl:w-56">
          <div className="sticky top-8 rounded-xl border border-border bg-card p-4">
            <DocsTableOfContents activeId={activeId} />
          </div>
        </aside>
      </div>
    </div>
  );
}
