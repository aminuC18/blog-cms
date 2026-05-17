# Bespoke Blog Platform — Enhanced Specification v2.1

> **v2.1 changelog:** Partner API (`/api/v1/blogs`), API key auth on all public read routes, API settings admin UI, Redis uploads cache, Sendbuddie static-site consumer pattern, corrected ports/env vars, honest testing status.

## Project Overview

Build a modern, production-grade bespoke blog platform — a lightweight custom CMS similar to Medium, Hashnode, Dev.to, and Ghost — but fully owned and bespoke.

**Core Tech Stack**

| Layer | Technology |
|---|---|
| Backend | NestJS + MongoDB + Mongoose |
| Frontend | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Authentication | JWT (Access + Refresh Tokens) |
| Image Uploads | Cloudinary (images + raw files in `blog/uploads`) |
| Rich Text Editor | Tiptap |
| State Management | TanStack Query (React Query) |
| Form Validation | React Hook Form + Zod |
| Testing | Jest + Supertest (backend; partial coverage), Playwright (planned, not yet in repo) |
| API Docs | Swagger / OpenAPI at `/api/docs` |
| Monorepo | `blog-cms/` (CMS + public site); consumers e.g. `sendbuddie-web-v1/` |

**Platform capabilities**

- User authentication with refresh token rotation
- Role-based access control (SUPER_ADMIN, ADMIN, AUTHOR, REVIEWER)
- Full blog creation and editorial workflow with rejection path
- Blog revision history
- Blog review and approval workflow
- Publishing, unpublishing, and scheduled publishing
- Soft delete with restore
- Public blog APIs with pagination and full-text search (**API-key protected**)
- Partner / headless API (`/api/v1/blogs`) for external sites (Sendbuddie, etc.)
- API key management (dashboard UI, hashed storage, optional IP whitelist)
- Tag management as first-class entities
- Author profiles
- In-app and email notifications
- Comment system (moderated)
- Dashboard **blog composer** on create/edit: tags, SEO overrides, media library pickers, live slug preview, Tiptap with code highlighting
- Dashboard **Files** library: browse and upload assets under `CLOUDINARY_UPLOAD_FOLDER` (default `blog/uploads`)
- SEO: dynamic metadata, Open Graph, sitemap, robots.txt

---

# 1. Environment Variables

All required environment variables. Commit a `.env.example` with these keys (no values).

## Backend `.env`

```env
# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3002
# Comma-separated origins (CMS frontend + partner sites, e.g. Sendbuddie)
# CORS_ORIGINS=http://localhost:3002,https://www.sendbuddie.com
TRUST_PROXY=false

# Partner / public read APIs — clients send: x-api-key: <key>
# Prefer Dashboard → API settings → Generate API key (stored hashed in MongoDB).
# Optional env fallbacks for dev/CI:
# PUBLIC_API_KEY=bk_your_dev_key_here
# PUBLIC_API_KEYS=second_key,third_key
# PUBLIC_API_IP_WHITELIST=203.0.113.10,198.51.100.0/24
# API_KEY_PEPPER=optional_secret_used_when_hashing_keys

# Database
MONGO_URI=mongodb://127.0.0.1:27017/blogdb

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=blog/uploads

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=no-reply@yourdomain.com

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Cache — GET /api/uploads listings (optional; docker compose includes redis)
REDIS_URL=redis://127.0.0.1:6379
UPLOADS_CACHE_TTL_SECONDS=300
```

## Frontend (CMS) `.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3002
NEXT_PUBLIC_SITE_NAME=My Blog

# Server-only: same key as Dashboard → API settings (for SSR /api/public fetches)
BLOG_API_KEY=bk_your_api_key_here
```

## Partner site (e.g. Sendbuddie) `.env`

Used when the marketing site is a **static export** (S3 + CloudFront) with no Node server at runtime:

```env
NEXT_PUBLIC_BLOG_API_URL=https://your-blog-api.example.com/api
NEXT_PUBLIC_BLOG_API_KEY=bk_your_api_key_here
```

For local `next dev` only, an optional server proxy can inject the key (`BLOG_API_KEY`); production static builds must use `NEXT_PUBLIC_BLOG_API_KEY` (baked in at build time).

## Local dependencies

From repo root: `docker compose up -d` starts **MongoDB** and **Redis** (see `docker-compose.yml`).

---

# 2. User Roles & Permissions

## Roles

```ts
enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN       = 'ADMIN',
  AUTHOR      = 'AUTHOR',
  REVIEWER    = 'REVIEWER',
}
```

## Permission Matrix

| Permission | SUPER_ADMIN | ADMIN | REVIEWER | AUTHOR |
|---|:---:|:---:|:---:|:---:|
| Create/manage users | ✓ | ✓ | ✗ | ✗ |
| Deactivate users | ✓ | ✗ | ✗ | ✗ |
| Create/edit own blogs | ✓ | ✓ | ✗ | ✓ |
| Submit blog for review | ✓ | ✓ | ✗ | ✓ |
| Review blogs (REVIEWED/REJECTED) | ✓ | ✓ | ✓ | ✗ |
| Approve blogs | ✓ | ✓ | ✗ | ✗ |
| Publish / Unpublish blogs | ✓ | ✓ | ✗ | ✗ |
| Edit any blog | ✓ | ✓ | ✗ | ✗ |
| Delete any blog (soft) | ✓ | ✓ | ✗ | ✗ |
| Restore deleted blog | ✓ | ✗ | ✗ | ✗ |
| Manage tags | ✓ | ✓ | ✗ | ✗ |
| Moderate comments | ✓ | ✓ | ✗ | ✗ |
| Browse / upload media (`blog/uploads`) | ✓ | ✓ | ✓ | ✓ |
| Manage API keys & IP whitelist | ✓ | ✓ | ✗ | ✗ |
| View dashboard | ✓ | ✓ | ✓ | ✓ |

**User management notes**

- `ADMIN` and `SUPER_ADMIN` can create and list users from the dashboard.
- `ADMIN` may only assign `AUTHOR` or `REVIEWER` roles and may only update non-privileged accounts.
- `SUPER_ADMIN` can assign any role, activate/deactivate accounts, and manage all users.
- `AUTHOR` and `REVIEWER` cannot create or manage other users.

---

# 3. Default Admin Seed

Create a seed script at `src/database/seeds/admin.seed.ts` that runs on first boot if no SUPER_ADMIN exists.

## Default Credentials

```
Email:    admin@blog.com
Password: Admin@123
Role:     SUPER_ADMIN
```

Password must be hashed with bcrypt (salt rounds: 12).

## Seed Logic

```ts
async function seedAdmin() {
  const existing = await UserModel.findOne({ role: Role.SUPER_ADMIN });
  if (existing) return;

  const hashed = await bcrypt.hash('Admin@123', 12);
  await UserModel.create({
    name: 'Super Admin',
    email: 'admin@blog.com',
    password: hashed,
    role: Role.SUPER_ADMIN,
    isActive: true,
  });
}
```

Run via: `npm run seed`

---

# 4. Blog Workflow

## Status Lifecycle

```
DRAFT
  │
  ▼ (Author: submit-review)
SUBMITTED_FOR_REVIEW
  │                 │
  ▼                 ▼ (Reviewer/Admin: reject)
REVIEWED          REJECTED ──► DRAFT (author edits and resubmits)
  │
  ▼ (Admin+: approve)
APPROVED
  │
  ▼ (Admin+: publish)
PUBLISHED
  │
  ▼ (Admin+: unpublish)
UNPUBLISHED ──► APPROVED (re-publish)
```

## Status Enum

```ts
enum BlogStatus {
  DRAFT                  = 'DRAFT',
  SUBMITTED_FOR_REVIEW   = 'SUBMITTED_FOR_REVIEW',
  REVIEWED               = 'REVIEWED',
  REJECTED               = 'REJECTED',
  APPROVED               = 'APPROVED',
  PUBLISHED              = 'PUBLISHED',
  UNPUBLISHED            = 'UNPUBLISHED',
}
```

## Transition Rules

| From | To | Who | Notes |
|---|---|---|---|
| DRAFT | SUBMITTED_FOR_REVIEW | Author/Admin | Triggers notification to reviewer |
| SUBMITTED_FOR_REVIEW | REVIEWED | Reviewer/Admin | Reviewer adds notes |
| SUBMITTED_FOR_REVIEW | REJECTED | Reviewer/Admin | Must include rejection reason |
| REJECTED | DRAFT | Author | Author edits and resubmits |
| REVIEWED | APPROVED | Admin+ | |
| APPROVED | PUBLISHED | Admin+ | Sets `publishedAt`; supports scheduled publish |
| PUBLISHED | UNPUBLISHED | Admin+ | Sets `unpublishedAt` |
| UNPUBLISHED | PUBLISHED | Admin+ | Clears `unpublishedAt` |

---

# 5. MongoDB Schemas

## User Schema

```ts
{
  name:                 string,          // required
  email:                string,          // required, unique, lowercase
  password:             string,          // bcrypt hashed, never returned in responses
  role:                 Role,            // default: AUTHOR
  isActive:             boolean,         // default: true
  bio:                  string,          // short author bio
  avatarUrl:            string,          // Cloudinary URL
  username:             string,          // unique, URL-safe slug (for /authors/:username)
  socialLinks: {
    twitter?:           string,
    github?:            string,
    linkedin?:          string,
    website?:           string,
  },
  refreshToken:         string,          // hashed refresh token
  refreshTokenExpiry:   Date,
  emailNotificationPreferences: Map<string, boolean>,  // per NotificationType opt-out
  createdAt:            Date,
  updatedAt:            Date,
}
```

**Indexes:** `email` (unique), `username` (unique), `role`

> **UI note:** `emailNotificationPreferences` is persisted on the user model; profile UI for per-type opt-out is **planned**, not yet implemented in the dashboard.

## Blog Schema

```ts
{
  title:            string,              // required
  slug:             string,              // unique, auto-generated from title, URL-safe
  summary:          string,              // required, max 300 chars
  content:          string,              // Tiptap JSON or HTML
  coverImage:       string,              // Cloudinary URL
  images:           string[],            // additional embedded images
  tags:             ObjectId[],          // refs to Tag collection
  
  status:           BlogStatus,          // default: DRAFT
  
  author:           ObjectId,            // ref: User, required
  reviewedBy:       ObjectId,            // ref: User
  reviewNotes:      string,              // reviewer feedback
  approvedBy:       ObjectId,            // ref: User
  rejectedBy:       ObjectId,            // ref: User
  rejectionReason:  string,              // required when status = REJECTED

  publishedAt:      Date,
  scheduledAt:      Date,                // optional: future publish date
  unpublishedAt:    Date,

  version:          number,              // increments on each edit, default: 1
  revisions:        ObjectId[],          // refs to BlogRevision collection

  metaTitle:        string,
  metaDescription:  string,
  ogImage:          string,

  readingTime:      number,              // auto-calculated in minutes
  viewCount:        number,              // default: 0
  commentCount:     number,              // denormalised count

  isDeleted:        boolean,             // default: false (soft delete)
  deletedAt:        Date,
  deletedBy:        ObjectId,            // ref: User

  createdAt:        Date,
  updatedAt:        Date,
}
```

**Indexes:** `slug` (unique), `status`, `author`, `tags`, `publishedAt`, `isDeleted`, full-text on `title + summary + content`

**Pre-save hooks:**
- Auto-generate `slug` from `title` if not provided; append `-N` suffix on collision
- Auto-calculate `readingTime` from content word count (avg 200 wpm)
- Increment `version` on content/title change

## BlogRevision Schema

```ts
{
  blog:       ObjectId,   // ref: Blog
  version:    number,
  title:      string,
  content:    string,
  summary:    string,
  editedBy:   ObjectId,  // ref: User
  editedAt:   Date,
}
```

## Tag Schema

```ts
{
  name:         string,   // required, unique, max 50 chars
  slug:         string,   // unique, auto-generated
  description:  string,
  color:        string,   // hex colour for UI badge
  blogCount:    number,   // denormalised count, default: 0
  createdAt:    Date,
  updatedAt:    Date,
}
```

**Indexes:** `slug` (unique), `name` (unique, case-insensitive)

## Comment Schema

```ts
{
  blog:         ObjectId,   // ref: Blog
  author:       ObjectId,   // ref: User
  content:      string,     // required, max 2000 chars
  parentComment: ObjectId,  // ref: Comment (for nested replies, 1 level deep)
  isApproved:   boolean,    // default: false (moderated)
  isDeleted:    boolean,     // default: false
  createdAt:    Date,
  updatedAt:    Date,
}
```

**Indexes:** `blog`, `author`, `isApproved`, `isDeleted`

## Notification Schema

```ts
{
  recipient:    ObjectId,           // ref: User
  type:         NotificationType,
  message:      string,
  relatedBlog:  ObjectId,           // ref: Blog
  isRead:       boolean,            // default: false
  createdAt:    Date,
}

enum NotificationType {
  BLOG_SUBMITTED_FOR_REVIEW   = 'BLOG_SUBMITTED_FOR_REVIEW',
  BLOG_REVIEWED               = 'BLOG_REVIEWED',
  BLOG_REJECTED               = 'BLOG_REJECTED',
  BLOG_APPROVED               = 'BLOG_APPROVED',
  BLOG_PUBLISHED              = 'BLOG_PUBLISHED',
  COMMENT_POSTED              = 'COMMENT_POSTED',
  COMMENT_REPLY               = 'COMMENT_REPLY',
}
```

## ApiKey Schema (partner / public read auth)

```ts
{
  name:         string,   // label shown in dashboard (e.g. "Sendbuddie production")
  keyHash:      string,   // SHA-256(pepper + plainKey); never returned to clients
  keyPrefix:    string,   // first segment for UI (e.g. bk_a1b2c3d4)
  isActive:     boolean,  // default: true; false when revoked
  createdBy:    ObjectId, // ref: User (ADMIN+ who generated the key)
  lastUsedAt:   Date,
  createdAt:    Date,
  updatedAt:    Date,
}
```

**Indexes:** `keyPrefix`, `isActive`

Plaintext keys are shown **once** on creation in Dashboard → API settings. Env fallbacks (`PUBLIC_API_KEY`, `PUBLIC_API_KEYS`) are supported for dev/CI but production should use dashboard-generated keys.

---

# 6. API Reference

## Standard Response Envelopes

### Success

```json
{
  "success": true,
  "data": { },
  "message": "Operation successful"
}
```

### Paginated List

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Must be a valid email" }
  ]
}
```

### Standard HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate slug) |
| 422 | Unprocessable — business rule violation |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Authentication

```http
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### `POST /api/auth/login`

**Body:**
```json
{ "email": "admin@blog.com", "password": "Admin@123" }
```

**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "...", "name": "...", "email": "...", "role": "SUPER_ADMIN" }
}
```

- `accessToken` expires in 15 minutes
- `refreshToken` expires in 7 days
- Store `refreshToken` in httpOnly cookie; `accessToken` in memory

### `POST /api/auth/refresh`

Accepts `refreshToken` from httpOnly cookie. Returns new `accessToken` and rotated `refreshToken`.

### `POST /api/auth/logout`

Clears the refreshToken from the DB and invalidates the cookie.

---

## Users

```http
POST   /api/users              # ADMIN+: create user
GET    /api/users              # ADMIN+: list all users
GET    /api/users/:id          # ADMIN+, or own profile
PATCH  /api/users/:id          # SUPER_ADMIN, ADMIN (AUTHOR/REVIEWER only), or own profile
PATCH  /api/users/:id/activate    # SUPER_ADMIN only
PATCH  /api/users/:id/deactivate  # SUPER_ADMIN only
```

**Query params for `GET /api/users`:** `page`, `limit`, `role`, `isActive`, `search`

### `POST /api/users`

**Body:**
```json
{
  "name": "Jane Author",
  "email": "author@blog.com",
  "password": "Author@123",
  "role": "AUTHOR"
}
```

**Role assignment rules**

| Actor | Allowed roles on create |
|---|---|
| `SUPER_ADMIN` | `SUPER_ADMIN`, `ADMIN`, `AUTHOR`, `REVIEWER` |
| `ADMIN` | `AUTHOR`, `REVIEWER` |

**Response:** standard success envelope with the created user (password omitted).

---

## Blogs

```http
POST   /api/blogs                       # Create (AUTHOR, ADMIN, SUPER_ADMIN)
GET    /api/blogs                       # Dashboard list (authenticated, all roles)
GET    /api/blogs/slug-preview          # Preview unique slug from title (authenticated)
GET    /api/blogs/:id                   # Get single blog (authenticated)
PATCH  /api/blogs/:id                   # Edit (AUTHOR=own only, ADMIN+=any)
DELETE /api/blogs/:id                   # Soft delete (ADMIN+)

POST   /api/blogs/:id/submit-review     # AUTHOR/ADMIN → SUBMITTED_FOR_REVIEW
POST   /api/blogs/:id/review            # REVIEWER/ADMIN → REVIEWED
POST   /api/blogs/:id/reject            # REVIEWER/ADMIN → REJECTED (body: { reason })
POST   /api/blogs/:id/approve           # ADMIN+ → APPROVED
POST   /api/blogs/:id/publish           # ADMIN+ → PUBLISHED (body: { scheduledAt? })
POST   /api/blogs/:id/unpublish         # ADMIN+ → UNPUBLISHED

GET    /api/blogs/:id/revisions         # ADMIN+: list revisions
GET    /api/blogs/:id/revisions/:verId  # ADMIN+: get specific revision

POST   /api/blogs/:id/restore           # SUPER_ADMIN: restore soft-deleted blog
```

**Query params for `GET /api/blogs`:** `page`, `limit`, `status`, `author`, `tag`, `search`

### `POST /api/blogs` — create body (dashboard composer)

Authors and admins create drafts with rich metadata. All fields beyond `title` and `summary` are optional.

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | Required. Drives default slug generation server-side. |
| `summary` | string | Required, max 300 characters. Used in listings and as default meta description. |
| `content` | string | HTML from Tiptap; default empty string server-side. |
| `coverImage` | string | Public image URL (e.g. from Cloudinary). |
| `tags` | string[] | MongoDB ObjectIds of existing tags; syncs tag `blogCount`. |
| `metaTitle` | string | SEO / Open Graph title override; public site falls back to `title` when blank. |
| `metaDescription` | string | SEO description override; falls back to `summary` when blank. |
| `ogImage` | string | Open Graph image URL; falls back to `coverImage` when blank. |

### `PATCH /api/blogs/:id` — composer fields

Same optional fields as create, plus:

| Field | Type | Notes |
|-------|------|--------|
| `slug` | string | **Only while status is not `PUBLISHED`.** Unique slug; normalized server-side. If `title` changes and `slug` is omitted, the server may regenerate slug from the new title. Sending the current slug preserves it. |

### `GET /api/blogs/slug-preview`

**Query:** `title` (string, optional), `excludeId` (Mongo id, optional).

**Response:** `{ "slug": "<unique-slug>" }` — uses the same collision rules as create/update. Pass `excludeId` when editing a draft so the current post’s slug does not count as a collision.

**Use case:** Dashboard “Create blog” / “Edit blog” shows a live public URL preview (`NEXT_PUBLIC_SITE_URL/blog/{slug}`) as the author types the title.

### Dashboard blog composer (UI)

Implemented on **`/dashboard/blogs/new`** and **`/dashboard/blogs/[id]`**:

- **Title** with debounced **slug preview** (calls `GET /api/blogs/slug-preview`).
- **Summary** with character counter (300 max, aligned with DTO).
- **Tags** — multi-select chips loaded from `GET /api/tags` (authors see all tags; only admins create tags under `/dashboard/tags`).
- **Cover image** — URL field plus **Library** button opening a modal of image assets from `GET /api/uploads` (same Cloudinary folder as Files).
- **SEO** — collapsible panel for `metaTitle`, `metaDescription`, `ogImage` (with library picker for OG image).
- **Body** — Tiptap with StarterKit (minus default code block), **syntax-highlighted code blocks** (`@tiptap/extension-code-block-lowlight` + `lowlight/common`), headings H2/H3, lists, blockquote, horizontal rule, link prompt, image upload (`POST /api/uploads/image`).

---

## Tags

```http
POST   /api/tags          # Create (ADMIN+)
GET    /api/tags          # List all tags (authenticated)
GET    /api/tags/:id      # Get tag (authenticated)
PATCH  /api/tags/:id      # Update (ADMIN+)
DELETE /api/tags/:id      # Delete (ADMIN+) — only if blogCount = 0
```

---

## Comments

```http
GET    /api/blogs/:id/comments        # Get approved comments for a blog
POST   /api/blogs/:id/comments        # Post a comment (authenticated)
DELETE /api/comments/:id              # Delete own comment or ADMIN+

GET    /api/admin/comments            # ADMIN+: list pending/all comments
PATCH  /api/admin/comments/:id/approve   # ADMIN+: approve comment
PATCH  /api/admin/comments/:id/reject    # ADMIN+: reject comment
```

---

## Notifications

```http
GET    /api/notifications             # Get own notifications
PATCH  /api/notifications/:id/read   # Mark single as read
PATCH  /api/notifications/read-all   # Mark all as read
GET    /api/notifications/unread-count
```

---

## Image Uploads

```http
GET    /api/uploads              # List assets in CLOUDINARY_UPLOAD_FOLDER (default blog/uploads)
POST   /api/uploads/image        # Upload a single image (authenticated)
POST   /api/uploads/file         # Upload image or PDF to same folder (authenticated)
```

### `GET /api/uploads`

Lists Cloudinary resources whose `public_id` is under the configured upload folder (prefix match). Used by the dashboard **Files** screen.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Pagination cursor from previous response (`nextCursor`) |
| `limit` | number | 24 | Page size (max 100) |

**Response (inside standard `data` envelope):**

```json
{
  "items": [
    {
      "publicId": "blog/uploads/abc123",
      "url": "https://res.cloudinary.com/...",
      "format": "jpg",
      "resourceType": "image",
      "bytes": 120400,
      "createdAt": "2026-05-14T12:00:00Z",
      "width": 1200,
      "height": 800
    }
  ],
  "nextCursor": "optional-string-for-next-page"
}
```

**Auth:** `AUTHOR`, `REVIEWER`, `ADMIN`, `SUPER_ADMIN`.

**Caching:** When `REDIS_URL` is set, listing responses may include `X-Cache: HIT|MISS` (and optionally `X-Cache-Layer`) on the response. TTL controlled by `UPLOADS_CACHE_TTL_SECONDS`.

---

### `POST /api/uploads/image`

**Request:** `multipart/form-data` with field `image`

**Constraints:**
- Max file size: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Images are uploaded to Cloudinary under `CLOUDINARY_UPLOAD_FOLDER`
- Cloudinary auto-optimises and returns a CDN URL

**Response:**
```json
{
  "url": "https://res.cloudinary.com/your_cloud/image/upload/v1/blog/uploads/abc123.webp",
  "publicId": "blog/uploads/abc123",
  "width": 1200,
  "height": 630
}
```

---

### `POST /api/uploads/file`

**Request:** `multipart/form-data` with field `file`

**Constraints:**
- Max file size: 10MB
- Allowed types (validated with `file-type`): `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Same Cloudinary folder as images; PDFs stored as `resource_type: raw`

**Response:** same shape as image upload, plus `bytes`, `format`, `resourceType` when applicable.

---

## Public read APIs (`/api/public/*`)

Read-only endpoints for the CMS public site and integrations. **All routes require the `x-api-key` header** (same keys as Partner API). Missing or invalid key → **401**.

```http
GET   /api/public/blogs                  # Published blogs list
GET   /api/public/blogs/:slug            # Single published blog by slug
GET   /api/public/tags                   # All tags with blog counts
GET   /api/public/tags/:slug/blogs       # Blogs by tag
GET   /api/public/authors/:username      # Author public profile
GET   /api/public/authors/:username/blogs  # Author's published blogs
GET   /api/public/search?q=...           # Full-text search
GET   /api/public/sitemap                # Sitemap data (consumed by Next.js sitemap route)
```

**Request header (required):**

```http
x-api-key: bk_your_api_key_here
```

**CMS frontend:** server-side fetches use `BLOG_API_KEY` (never exposed to the browser).

**Partner static sites:** use `NEXT_PUBLIC_BLOG_API_KEY` at build time (see §25).

Swagger documents this under the `api-key` security scheme at `/api/docs`.

---

## Partner API (`/api/v1/blogs`)

Headless API for external properties (e.g. Sendbuddie marketing site). Same published data as `/api/public/*`, narrower surface. **Requires `x-api-key`.**

```http
GET   /api/v1/blogs                      # Published blogs list (paginated)
GET   /api/v1/blogs/:slug                # Single published blog by slug (full content)
GET   /api/v1/blogs/tags                 # All tags
GET   /api/v1/blogs/tags/:slug           # Published blogs for tag slug
```

### `GET /api/v1/blogs` query params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Results per page (max 50) |
| `tag` | string | — | Filter by tag slug |
| `author` | string | — | Filter by author username |
| `q` | string | — | Full-text search query |
| `sort` | string | `publishedAt:desc` | `publishedAt:desc` \| `publishedAt:asc` \| `viewCount:desc` \| `title:asc` \| `title:desc` |

---

## API settings (authenticated, ADMIN+)

Manage partner keys and optional IP restrictions. Documented in Swagger under `API settings`.

```http
GET    /api/api-settings                 # Overview: keys (prefix only), IP rules, env fallback flags
POST   /api/api-settings/keys            # Generate key — plaintext returned once in response
DELETE /api/api-settings/keys/:id        # Revoke key
POST   /api/api-settings/ip-rules        # Add IP or CIDR whitelist entry
DELETE /api/api-settings/ip-rules/:id      # Remove IP rule
```

**IP whitelist:** When rules exist in the database, requests without a matching client IP are rejected. Env `PUBLIC_API_IP_WHITELIST` can supplement rules for bootstrap/dev.

**Dashboard UI:** `/dashboard/settings` (generate/revoke keys, manage IP rules). In-app API reference: `/dashboard/docs`.

---

### `GET /api/public/blogs` query params

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Results per page (max 50) |
| `tag` | string | — | Filter by tag slug |
| `author` | string | — | Filter by author username |
| `q` | string | — | Full-text search query |
| `sort` | string | `publishedAt:desc` | Sort field and direction |

---

# 7. Image & file upload strategy

## Dashboard Files library

Authors and staff open **Dashboard → Files** to:

1. **Browse** all assets under `CLOUDINARY_UPLOAD_FOLDER` (default `blog/uploads`) via `GET /api/uploads` (Cloudinary Admin API list by prefix).
2. **Upload** additional images or PDFs via `POST /api/uploads/file` (or use `POST /api/uploads/image` from the Tiptap toolbar).
3. **Copy CDN URLs** into blog content, cover images, SEO `ogImage`, or profile `avatarUrl`.

## Flow (editor / cover)

```
User selects image in Tiptap editor or cover image picker
  → Frontend calls POST /api/uploads/image (multipart)
  → NestJS validates file type & size
  → Streams to Cloudinary via cloudinary.uploader.upload_stream()
  → Cloudinary returns secure_url and public_id
  → NestJS returns { url, publicId, width, height }
  → Frontend inserts URL into blog content or sets coverImage field
```

## Flow (dashboard Files)

```
User opens Dashboard → Files
  → Frontend calls GET /api/uploads?limit=24&cursor=…
  → NestJS calls Cloudinary Admin API (resources by prefix = CLOUDINARY_UPLOAD_FOLDER)
  → Returns { items, nextCursor } for the grid and “Load more”
User uploads from Files page
  → Frontend calls POST /api/uploads/file (multipart, field `file`)
  → NestJS validates MIME + size, streams to Cloudinary (image or raw)
  → Gallery refreshes; user copies secure_url for blogs or profile fields
```

## Cloudinary Transforms

Apply on-the-fly transforms via URL params:

- Cover image: `c_fill,w_1200,h_630,f_auto,q_auto`
- Blog card thumbnail: `c_fill,w_400,h_250,f_auto,q_auto`
- Author avatar: `c_fill,w_200,h_200,r_max,f_auto,q_auto`

## Deletion

When a blog is permanently deleted (future hard-delete admin action), also call `cloudinary.uploader.destroy(publicId)` for any associated images.

---

# 8. Rich Text Editor (Tiptap)

## Extensions to Install

```
@tiptap/extension-bold
@tiptap/extension-italic
@tiptap/extension-underline
@tiptap/extension-strike
@tiptap/extension-heading (levels: [1, 2, 3])
@tiptap/extension-paragraph
@tiptap/extension-blockquote
@tiptap/extension-bullet-list
@tiptap/extension-ordered-list
@tiptap/extension-code
@tiptap/extension-code-block-lowlight (with lowlight for syntax highlighting)
@tiptap/extension-link
@tiptap/extension-image
@tiptap/extension-horizontal-rule
@tiptap/extension-character-count (show word count, reading time estimate)
@tiptap/extension-placeholder
```

## Image Upload in Editor

When a user inserts an image in Tiptap:
1. Call `POST /api/uploads/image`
2. On success, insert the returned `url` into the editor via `editor.chain().setImage({ src: url }).run()`

## Storage Format

Store Tiptap content as **HTML** (not JSON) in MongoDB. This simplifies public rendering — content can be output directly in Next.js without a Tiptap render dependency.

---

# 9. Full-Text Search

## MongoDB Text Index

```ts
BlogSchema.index(
  { title: 'text', summary: 'text', content: 'text', 'tags.name': 'text' },
  { weights: { title: 10, summary: 5, content: 1 } }
);
```

## Search Query

```ts
// NestJS blog service
const results = await this.blogModel.find({
  $text: { $search: query },
  status: BlogStatus.PUBLISHED,
  isDeleted: false,
}, {
  score: { $meta: 'textScore' }
}).sort({ score: { $meta: 'textScore' } });
```

## Public Search Endpoint

`GET /api/public/search?q=nestjs+authentication&page=1&limit=10`

Response includes standard paginated envelope with blog summaries (no full content).

---

# 10. Notification System

## Trigger Points

| Event | Notify | Type |
|---|---|---|
| Blog submitted for review | All REVIEWERs + ADMINs | `BLOG_SUBMITTED_FOR_REVIEW` |
| Blog reviewed | Blog author | `BLOG_REVIEWED` |
| Blog rejected | Blog author | `BLOG_REJECTED` |
| Blog approved | Blog author | `BLOG_APPROVED` |
| Blog published | Blog author | `BLOG_PUBLISHED` |
| Comment posted on blog | Blog author | `COMMENT_POSTED` |
| Comment replied to | Original commenter | `COMMENT_REPLY` |

## Delivery Channels

**In-app notifications** (always): Persisted to Notification collection. Frontend polls `GET /api/notifications/unread-count` every 60 seconds (or uses WebSocket in v2).

**Email notifications** (configurable per user): Sent via Resend. Templates per notification type. Backend stores `emailNotificationPreferences` per notification type; **profile UI for opt-out is not yet implemented** (planned).

## Email Templates (minimal)

Each email contains:
- Platform name + logo
- One-line summary of the event
- CTA button linking to the relevant dashboard page
- Plain text fallback

---

# 11. Frontend Pages

## Public Pages

```
/                         Homepage: hero, featured blogs, recent blogs, tag cloud
/blog/[slug]              Single blog post
/blog/tag/[slug]          Blogs filtered by tag
/authors/[username]       Public author profile + their blogs
/search?q=                Search results page
/login                    Login page
/sitemap.xml              Next.js dynamic sitemap route
/robots.txt               robots.txt route handler
```

## Dashboard Pages (authenticated)

```
/dashboard                       Overview cards: total blogs, pending review, published
/dashboard/profile               Edit own profile, avatar, bio, social links
/dashboard/blogs                 Blog management table (filtered by role)
/dashboard/blogs/new             Create blog: title, slug preview, summary (300), tags, cover + SEO, Tiptap body
/dashboard/blogs/[id]            Edit blog: same composer fields; editable slug when not published; workflow actions
/dashboard/files                 Media library: list + upload assets in blog/uploads (Cloudinary)
/dashboard/tags                  Tag management (ADMIN+)
/dashboard/users                 User management (ADMIN+)
/dashboard/comments              Comment moderation queue (ADMIN+)
/dashboard/notifications         Notification centre
/dashboard/settings              API keys + IP whitelist (ADMIN+)
/dashboard/docs                  In-app public/partner API documentation
```

> **Revisions UI:** `GET /api/blogs/:id/revisions` is implemented; a dedicated `/dashboard/blogs/[id]/revisions` page is **not** in the current frontend — use API or Swagger until the history panel ships.

---

# 12. Admin Dashboard UI

## Layout

```
┌─────────────────────────────────────────────┐
│  Navbar (logo, notifications bell, avatar)  │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │  Main Content Area               │
│          │                                  │
│ - Dashboard                                 │
│ - Blogs                                     │
│ - Files                                     │
│ - Tags                                      │
│ - Comments                                  │
│ - Users                                     │
│ - Settings (API keys)                       │
│ - Docs (API reference)                      │
│ - Profile                                   │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

## shadcn/ui Components

- `Sheet` — mobile sidebar drawer
- `NavigationMenu` — sidebar nav
- `Card` — dashboard metric cards
- `DataTable` (with TanStack Table) — blogs, users, tags, comments
- `Dialog` / `AlertDialog` — confirm actions (delete, publish)
- `Form` + `Input` + `Textarea` + `Select` — all forms
- `Badge` — blog status indicators (colour-coded per status)
- `Tabs` — blog edit page (Content / SEO / Settings tabs)
- `DropdownMenu` — row actions in tables
- `Toaster` (Sonner) — success/error notifications
- `Avatar` — user avatars
- `Skeleton` — loading states for all data-fetching components
- `Pagination` — table pagination
- `Command` + `Popover` — tag multi-select input

## Status Badge Colours

| Status | Colour |
|---|---|
| DRAFT | gray |
| SUBMITTED_FOR_REVIEW | blue |
| REVIEWED | amber |
| REJECTED | red |
| APPROVED | teal |
| PUBLISHED | green |
| UNPUBLISHED | orange |

---

# 13. Blog Table (Dashboard)

## Columns

| Column | Notes |
|---|---|
| Title | Truncated, links to edit page |
| Author | Avatar + name |
| Status | Colour-coded badge |
| Tags | Up to 3 tag badges |
| Views | `viewCount` |
| Created | Relative date |
| Actions | Dropdown |

## Actions (conditional on role + status)

| Action | Visible when |
|---|---|
| Edit | AUTHOR (own) or ADMIN+ (any) |
| View live | Status = PUBLISHED |
| Submit for review | Status = DRAFT or REJECTED; own blog |
| Review | Status = SUBMITTED_FOR_REVIEW; REVIEWER or ADMIN+ |
| Reject | Status = SUBMITTED_FOR_REVIEW; REVIEWER or ADMIN+ |
| Approve | Status = REVIEWED; ADMIN+ |
| Publish | Status = APPROVED; ADMIN+ |
| Unpublish | Status = PUBLISHED; ADMIN+ |
| View revisions (API) | ADMIN+ |
| Delete | ADMIN+; not already deleted |
| Restore | SUPER_ADMIN; isDeleted = true |

---

# 14. SEO

## Next.js Metadata

Use the App Router `generateMetadata` export on every public page:

```ts
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const blog = await getBlogBySlug(params.slug);
  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.summary,
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.summary,
      images: [{ url: blog.ogImage || blog.coverImage, width: 1200, height: 630 }],
      type: 'article',
      publishedTime: blog.publishedAt,
      authors: [blog.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.summary,
      images: [blog.ogImage || blog.coverImage],
    },
  };
}
```

## Sitemap

```ts
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await getPublishedBlogSlugs(); // calls GET /api/public/sitemap (with BLOG_API_KEY)
  return [
    { url: SITE_URL, lastModified: new Date() },
    ...blogs.map(b => ({
      url: `${SITE_URL}/blog/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ];
}
```

## robots.txt

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

---

# 15. Security

## Implementation Checklist

- **Password hashing**: bcrypt, salt rounds 12
- **JWT**: short-lived access tokens (15m) + httpOnly refresh token cookie (7d) with rotation
- **Guards**: `JwtAuthGuard` + `RolesGuard` on all protected routes via NestJS decorators
- **Helmet**: sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: `CORS_ORIGINS` (comma-separated) when set; otherwise `[FRONTEND_URL]`. Credentials: true. Allowed headers include `x-api-key`.
- **Partner API auth**: `ApiKeyGuard` on `/api/public/*` and `/api/v1/blogs/*`; keys hashed in MongoDB; optional IP whitelist
- **Rate limiting**: NestJS `@nestjs/throttler` — 100 requests / 60 seconds globally; tighter on auth routes (10 req / 60s)
- **Input validation**: `class-validator` + `class-transformer` with NestJS `ValidationPipe` (whitelist: true, forbidNonWhitelisted: true)
- **Mongo injection**: Mongoose sanitises queries; never pass raw user input to `$where` or JS operators
- **File upload**: validate MIME type and file size in Multer; scan with `file-type` package to prevent extension spoofing

## Auth Route Rate Limits

```ts
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

---

# 16. Blog Revision History

## When a Revision is Created

Whenever the `content`, `title`, or `summary` of a blog is updated via `PATCH /api/blogs/:id`, the system:

1. Creates a `BlogRevision` document capturing the current state before the update
2. Increments `blog.version`
3. Pushes the new revision `_id` into `blog.revisions[]`

## API

```http
GET /api/blogs/:id/revisions              # Returns list of revisions (version, editedBy, editedAt)
GET /api/blogs/:id/revisions/:versionId   # Returns full revision content
```

> **Current status:** Revisions are stored and exposed via API. Dashboard version-history UI and restore-from-revision are **planned**, not yet implemented.

---

# 17. Comment System

## Moderation Flow

```
User posts comment
  → isApproved = false
  → ADMIN receives notification
  → ADMIN reviews in /dashboard/comments
  → ADMIN approves → comment visible on public blog
  → ADMIN rejects → comment soft-deleted
```

## Nesting

Comments support one level of replies only (a reply cannot have replies). `parentComment` field links to the parent.

## Public Comment Display

Only `isApproved = true` and `isDeleted = false` comments are returned by the public API.

---

# 18. Scheduled Publishing

If `scheduledAt` is provided in the publish request body, set `blog.scheduledAt` without changing status to PUBLISHED yet.

A background cron job (NestJS `@nestjs/schedule`) runs every minute:

```ts
@Cron(CronExpression.EVERY_MINUTE)
async publishScheduledBlogs() {
  const due = await this.blogModel.find({
    status: BlogStatus.APPROVED,
    scheduledAt: { $lte: new Date() },
    isDeleted: false,
  });
  for (const blog of due) {
    blog.status = BlogStatus.PUBLISHED;
    blog.publishedAt = new Date();
    blog.scheduledAt = undefined;
    await blog.save();
    // trigger notification
  }
}
```

---

# 19. Testing Strategy

## Current state (as implemented)

| Area | Status |
|---|---|
| `api-key.guard.spec.ts` | Unit tests for API key extraction and guard behavior |
| `backend/test/app.e2e-spec.ts` | Boilerplate only (not aligned with real `/api` routes) |
| Blog lifecycle / auth e2e | **Not implemented** |
| Frontend Playwright | **Not in repo** |

## Target state (roadmap)

**Backend unit tests** — `jest`
- Service methods (blog status transitions, permission checks)
- Guard logic (`JwtAuthGuard`, `RolesGuard`, `ApiKeyGuard`)
- Utility functions (slug generation, reading time, IP whitelist)

**Backend e2e** — `jest` + `supertest` + `mongodb-memory-server`
- Auth flow (login, refresh, logout)
- Blog lifecycle (create → submit → review → approve → publish)
- Public/partner routes with valid and invalid `x-api-key`
- Permission boundary tests (assert 403s for wrong roles)

**Frontend e2e** — Playwright (planned)
- Login flow, blog composer, dashboard tables, public SEO metadata

**Run commands (monorepo):**

```bash
# From blog-cms/
pnpm --filter backend test
pnpm --filter backend test:e2e
```

---

# 20. Deployment

## Monorepo layout

```
blog-cms/
├── backend/     # NestJS API (default PORT 3001)
├── frontend/    # Next.js CMS + public blog (default 3002)
├── docker-compose.yml   # local MongoDB + Redis
└── .github/workflows/ci.yml
```

## Backend

**Host:** VPS with Docker (see `deploy/README.md`).

**Required env:** `MONGO_URI`, JWT secrets, Cloudinary, `FRONTEND_URL`, `CORS_ORIGINS` (include all partner origins), partner key via dashboard or `PUBLIC_API_KEY` for bootstrap.

**Optional:** `REDIS_URL` for uploads list cache; `TRUST_PROXY=true` behind a reverse proxy.

**Docker:** Multi-stage Node 20 image; expose `3001`; run `node dist/main.js`.

## CMS frontend

**Host:** Vercel or similar (Next.js App Router).

**Env:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `BLOG_API_KEY` (server-only, for `/api/public` SSR).

## Database & cache

- **MongoDB Atlas** (or self-hosted via `docker compose`) for application data.
- **Redis** (optional, recommended in production) for uploads listing cache; included in root `docker-compose.yml`.

## CI

GitHub Actions at `.github/workflows/ci.yml` — install, lint, build backend and frontend. Extend with real e2e before gating deploys on `test:e2e`.

## Partner site (Sendbuddie)

Separate repo: `sendbuddie-web-v1`. Production uses **static export** to S3 + CloudFront (`output: 'export'`). No runtime server to hold secrets.

**Build-time env (Bitbucket / CI):**
- `NEXT_PUBLIC_BLOG_API_URL` — blog CMS API base (e.g. `https://api.blog.example.com/api`)
- `NEXT_PUBLIC_BLOG_API_KEY` — read-only partner key (restrict by IP in CMS → API settings when possible)

**CORS:** Add Sendbuddie origin(s) to backend `CORS_ORIGINS`.

**Local dev:** Optional `src/app/api/blog/[...path]/route.ts` proxy with `BLOG_API_KEY` — not used in S3 production builds.

---

# 21. Project Structure

## Backend (NestJS)

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   └── decorators/
│       ├── roles.decorator.ts
│       └── current-user.decorator.ts
├── users/
├── blogs/
│   ├── blogs.controller.ts
│   ├── blogs.service.ts
│   ├── blogs.module.ts
│   ├── schemas/
│   │   ├── blog.schema.ts
│   │   └── blog-revision.schema.ts
│   └── dto/
├── tags/
├── comments/
├── notifications/
├── uploads/
├── public/
│   ├── public.controller.ts
│   └── public.service.ts
├── external/
│   └── external-blogs.controller.ts
├── api-key/
│   ├── api-key.guard.ts
│   └── api-key.service.ts
├── api-settings/
│   ├── api-settings.controller.ts
│   ├── api-settings.service.ts
│   └── schemas/api-key.schema.ts
├── database/
│   └── seeds/
│       └── admin.seed.ts
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── response.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── utils/
│       ├── slug.util.ts
│       └── reading-time.util.ts
└── main.ts
```

## Frontend (Next.js)

```
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx             (homepage)
│   │   ├── blog/[slug]/page.tsx
│   │   ├── blog/tag/[slug]/page.tsx
│   │   ├── authors/[username]/page.tsx
│   │   └── search/page.tsx
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx           (sidebar + navbar)
│   │   ├── page.tsx
│   │   ├── blogs/
│   │   ├── files/               (media library: blog/uploads)
│   │   ├── tags/
│   │   ├── users/
│   │   ├── comments/
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── docs/
│   │   └── profile/
│   ├── sitemap.ts
│   ├── robots.ts
│   └── layout.tsx
├── components/
│   ├── ui/                      (shadcn/ui, auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Navbar.tsx
│   ├── blog/
│   │   ├── BlogCard.tsx
│   │   ├── BlogTable.tsx
│   │   └── BlogEditor.tsx       (Tiptap wrapper)
│   └── shared/
│       ├── StatusBadge.tsx
│       └── Pagination.tsx
├── lib/
│   ├── api/
│   │   ├── axios.ts             (Axios instance with interceptors)
│   │   ├── auth.api.ts
│   │   ├── blogs.api.ts
│   │   ├── uploads.api.ts
│   │   ├── public.api.ts
│   │   └── blog-api-key.ts
│   └── utils.ts                 (cn helper, formatDate, etc.)
├── hooks/
│   ├── useAuth.ts
│   └── useBlogs.ts
└── types/
    ├── blog.types.ts
    ├── user.types.ts
    └── api.types.ts
```

---

# 22. Slug Generation Strategy

Slugs are auto-generated from the blog title on creation. They are immutable after the blog is first published (to preserve inbound links).

```ts
// src/common/utils/slug.util.ts
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// In BlogService.create()
async function createUniqueSlug(title: string): Promise<string> {
  const base = generateSlug(title);
  let slug = base;
  let counter = 1;
  while (await BlogModel.exists({ slug })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}
```

**Rule**: If a blog's title is edited after creation but before publishing, offer to regenerate the slug. Once published, slug is locked.

---

# 23. Reading Time Calculation

Auto-calculated on save, not stored as user input.

```ts
export function calculateReadingTime(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]+>/g, ''); // strip tags
  const wordCount = text.trim().split(/\s+/).length;
  const wpm = 200;
  return Math.max(1, Math.ceil(wordCount / wpm));
}
```

Display in frontend: "5 min read"

---

# 24. Soft Delete Strategy

## Delete

`DELETE /api/blogs/:id` sets:
```ts
{
  isDeleted: true,
  deletedAt: new Date(),
  deletedBy: currentUser._id,
}
```

If blog was PUBLISHED, also set status to UNPUBLISHED.

## Global Query Filter

Apply a Mongoose plugin or always include `{ isDeleted: false }` in service queries. Never expose deleted blogs in any public or dashboard list unless the user is SUPER_ADMIN and explicitly filters for them.

```ts
// In blog service — always exclude deleted
const blogs = await this.blogModel.find({ ...filter, isDeleted: false });
```

## Restore

`POST /api/blogs/:id/restore` (SUPER_ADMIN only):
```ts
{
  isDeleted: false,
  deletedAt: undefined,
  deletedBy: undefined,
  status: BlogStatus.DRAFT, // reset to DRAFT on restore
}
```

---

# 25. External consumers (Sendbuddie)

The blog CMS is designed as a **headless** source of published content. The Sendbuddie marketing site (`sendbuddie-web-v1`) consumes it without sharing the CMS database.

## Integration flow

```text
┌─────────────────────┐     x-api-key      ┌──────────────────────┐
│  Sendbuddie (S3)    │ ─────────────────► │  Blog CMS API        │
│  Static Next export │   /api/public/*   │  NestJS + MongoDB    │
│  or /api/v1/blogs   │   or /api/v1/*    │                      │
└─────────────────────┘                    └──────────────────────┘
```

## Client configuration

| Runtime | API URL env | API key env | Notes |
|---|---|---|---|
| CMS frontend (SSR) | `NEXT_PUBLIC_API_URL` | `BLOG_API_KEY` | Server-only; not in browser bundle |
| Sendbuddie production | `NEXT_PUBLIC_BLOG_API_URL` | `NEXT_PUBLIC_BLOG_API_KEY` | Baked in at `next build` |
| Sendbuddie `next dev` | same | `NEXT_PUBLIC_*` or proxy + `BLOG_API_KEY` | Proxy route optional |

## Typical endpoints used

- `GET /api/public/blogs` — listing with pagination, tag, author, search
- `GET /api/public/blogs/:slug` — post detail
- `GET /api/public/tags` — tag index

Equivalent partner paths under `/api/v1/blogs` (subset of the above).

## Operational checklist

1. Deploy blog CMS backend with MongoDB and CORS configured.
2. **Dashboard → API settings** → generate key; copy plaintext immediately.
3. Add Sendbuddie origin to `CORS_ORIGINS`.
4. Set `NEXT_PUBLIC_BLOG_API_URL` and `NEXT_PUBLIC_BLOG_API_KEY` in Sendbuddie CI/CD.
5. Rebuild and deploy Sendbuddie static assets after key rotation.
6. (Recommended) Add IP whitelist rules for production Sendbuddie egress IPs.

## Security notes

- Treat `NEXT_PUBLIC_BLOG_API_KEY` as a **read-only public credential** (like a Maps API key). Scope keys to published reads only; rotate via dashboard if leaked.
- Never commit plaintext keys to git; use CI secrets.
- Prefer dashboard-managed keys over long-lived `PUBLIC_API_KEY` in production env files.
