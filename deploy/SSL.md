# SSL (HTTPS)

Main deploy guide: **[README.md](./README.md)**

## No domain yet — use the IP over HTTP

**Option A — ports (simplest):**

| | URL |
|---|-----|
| CMS | `http://5.189.147.227:3002` |
| API | `http://5.189.147.227:3001/api` |

**Option B — Nginx on IP (no domain):** `deploy/nginx/blog-cms.conf.example`  
CMS at `http://5.189.147.227/`, API at `http://5.189.147.227/api/` — see **README.md**.

**`backend/.env` (ports):**

```env
FRONTEND_URL=http://5.189.147.227:3002
CORS_ORIGINS=http://5.189.147.227:3002
COOKIE_SECURE=false
```

**`backend/.env` (Nginx on :80):**

```env
FRONTEND_URL=http://5.189.147.227
CORS_ORIGINS=http://5.189.147.227
COOKIE_SECURE=false
TRUST_PROXY=true
```

**Let's Encrypt cannot issue a trusted certificate for a bare IP.** When you buy or connect a domain, follow the steps below.

---

## Self-signed SSL on IP

Use **`deploy/nginx/blog-cms.conf.example`** — copy to the server (see comments at top of that file). Browsers will warn until you accept the certificate.

---

## With a domain (trusted HTTPS)

You need **two domain names** pointing to your VPS IP.

Example:

| DNS A record | Points to |
|--------------|-----------|
| `blog.yourdomain.com` | `5.189.147.227` |
| `api.blog.yourdomain.com` | `5.189.147.227` |

Docker keeps running on ports **3001** (API) and **3002** (CMS). Nginx on the server handles **443** and proxies to them.

---

## 1. DNS

At your domain registrar, add both **A records** to your Contabo IP. Wait until they resolve (check with `ping blog.yourdomain.com`).

---

## 2. Nginx (on the VPS)

Use **two `server` blocks** (one hostname for CMS, one for API). Replace domains in the config below, save as `/etc/nginx/sites-available/blog-cms`:

```nginx
upstream blog_cms { server 127.0.0.1:3002; }
upstream blog_api { server 127.0.0.1:3001; }

server {
  listen 80;
  server_name blog.yourdomain.com;
  location / {
    proxy_pass http://blog_cms;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name api.blog.yourdomain.com;
  location / {
    proxy_pass http://blog_api;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Test HTTP: `http://blog.yourdomain.com` and `http://api.blog.yourdomain.com/api/docs`

---

## 3. Let's Encrypt certificate

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx \
  -d blog.yourdomain.com \
  -d api.blog.yourdomain.com \
  --email you@yourdomain.com \
  --agree-tos
```

Certbot adds HTTPS and auto-renewal.

**Contabo / UFW:** ports **80** and **443** must be open.

---

## 4. Update `.env` (on the server only)

**`backend/.env`:**

```env
FRONTEND_URL=https://blog.yourdomain.com
CORS_ORIGINS=https://blog.yourdomain.com
TRUST_PROXY=true
```

Remove `COOKIE_SECURE=false` (cookies use `Secure` automatically when URL is `https://`).

**`frontend/.env`:**

```env
NEXT_PUBLIC_API_URL=https://api.blog.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://blog.yourdomain.com
NEXT_PUBLIC_SITE_NAME=My Blog
```

Rebuild:

```bash
cd /opt/blog-cms/backend && docker compose up -d --build
cd /opt/blog-cms/frontend && docker compose up -d --build
```

---

## 5. Use HTTPS URLs

| | URL |
|---|-----|
| CMS | `https://blog.yourdomain.com` |
| API | `https://api.blog.yourdomain.com/api` |

Stop using `:3001` / `:3002` in the browser (Nginx serves 443).

---

## SendBuddie

```env
NEXT_PUBLIC_BLOG_API_URL=https://api.blog.yourdomain.com/api
```

Add the SendBuddie site to `CORS_ORIGINS` in `backend/.env` if needed.
