# Blog CMS — Contabo deployment documentation

Deploy the NestJS API and Next.js CMS on a Contabo VPS with Docker. MongoDB runs on **Atlas** (cloud).

---

## Table of contents

1. [Architecture](#architecture)
2. [Paths and files](#paths-and-files)
3. [First-time setup](#first-time-setup)
4. [Environment variables](#environment-variables)
5. [Automated deployment](#automated-deployment)
6. [Manual deployment](#manual-deployment)
7. [Nginx and HTTPS](#nginx-and-https)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

```text
Browser
   │
   ├─ (optional) Nginx :80 / :443  ──► 127.0.0.1:3002  CMS (Docker)
   │                      /api/  ──► 127.0.0.1:3001  API (Docker)
   │
   └─ (direct)  :3002 CMS, :3001 API

API ──► MongoDB Atlas (mongodb+srv://...)
```

| Service | Container port | Direct URL (HTTP) |
|---------|----------------|-------------------|
| CMS | 3002 | `http://YOUR_VPS_IP:3002` |
| API | 3001 | `http://YOUR_VPS_IP:3001/api` |

With Nginx (recommended for one URL + optional self-signed HTTPS):

| URL | Proxies to |
|-----|------------|
| `https://YOUR_VPS_IP/` | CMS |
| `https://YOUR_VPS_IP/api/` | API |

---

## Paths and files

### On the VPS (server)

| Path | Purpose |
|------|---------|
| `/opt/blog-cms/` | Application root (`DEPLOY_PATH`) |
| `/opt/blog-cms/backend/.env` | API secrets — **edit only on server** |
| `/opt/blog-cms/frontend/.env` | CMS public URLs — **edit only on server** |
| `/etc/nginx/sites-available/blog-cms` | Nginx site config (after copy) |
| `/etc/nginx/ssl/blog-cms.crt` | Self-signed certificate |
| `/etc/nginx/ssl/blog-cms.key` | Private key |

### In the repository

| Path | Purpose |
|------|---------|
| `deploy/README.md` | This documentation |
| `deploy/SSL.md` | HTTPS options (IP vs domain) |
| `deploy/deploy.config.example` | Template for local deploy settings |
| `deploy/deploy.config` | Your settings (gitignored) |
| `deploy/scripts/install-docker.sh` | Install Docker on a fresh VPS |
| `deploy/scripts/deploy.sh` | Deploy from your Mac (rsync + rebuild) |
| `deploy/scripts/rebuild.sh` | Rebuild Docker on the VPS |
| `deploy/nginx/blog-cms.conf.example` | Nginx: HTTPS + proxy to Docker |
| `.github/workflows/deploy.yml` | GitHub Actions deploy on push to `main` |
| `backend/docker-compose.yml` | API container |
| `frontend/docker-compose.yml` | CMS container |

---

## First-time setup

### 1. Copy project to the VPS

From your Mac (first SSH: type `yes` for host key):

```bash
rsync -avz \
  --exclude node_modules --exclude .next --exclude dist --exclude .git \
  --exclude 'backend/.env' --exclude 'frontend/.env' \
  ./blog-cms/ root@YOUR_VPS_IP:/opt/blog-cms/
```

### 2. Install Docker (once)

```bash
ssh root@YOUR_VPS_IP
cd /opt/blog-cms
chmod +x deploy/scripts/*.sh
./deploy/scripts/install-docker.sh
exit
# Log out and back in so docker group applies
```

### 3. Configure environment

See [Environment variables](#environment-variables). Create `backend/.env` and `frontend/.env` on the **server only**.

### 4. Start containers

```bash
bash /opt/blog-cms/deploy/scripts/rebuild.sh
```

### 5. MongoDB Atlas

Atlas → **Network Access** → add your VPS public IP.

### 6. Default login

| Field | Value |
|-------|--------|
| URL | `http://YOUR_VPS_IP:3002` (or HTTPS via Nginx) |
| Email | `admin@blog.com` |
| Password | `Admin@123` |

Change the password after first login.

---

## Environment variables

**Never rsync or commit production `.env` files.** Keep them only on the VPS.

### `backend/.env` (required)

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/blogdb?retryWrites=true&w=majority
JWT_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### CORS and cookies (pick one layout)

**Direct ports (HTTP):**

```env
FRONTEND_URL=http://YOUR_VPS_IP:3002
CORS_ORIGINS=http://YOUR_VPS_IP:3002
COOKIE_SECURE=false
```

**Nginx on IP (HTTP port 80):**

```env
FRONTEND_URL=http://YOUR_VPS_IP
CORS_ORIGINS=http://YOUR_VPS_IP
COOKIE_SECURE=false
TRUST_PROXY=true
```

**Nginx + self-signed HTTPS:**

```env
FRONTEND_URL=https://YOUR_VPS_IP
CORS_ORIGINS=https://YOUR_VPS_IP
TRUST_PROXY=true
```

### `frontend/.env` (required — rebuild after changes)

**Direct ports:**

```env
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:3001/api
NEXT_PUBLIC_SITE_URL=http://YOUR_VPS_IP:3002
NEXT_PUBLIC_SITE_NAME=My Blog
```

**Nginx (HTTP or HTTPS):**

```env
NEXT_PUBLIC_API_URL=https://YOUR_VPS_IP/api
NEXT_PUBLIC_SITE_URL=https://YOUR_VPS_IP
NEXT_PUBLIC_SITE_NAME=My Blog
```

`NEXT_PUBLIC_*` values are baked in at **Docker build time**.

---

## Automated deployment

### Option A — Script from your Mac

1. Copy config:

```bash
cp deploy/deploy.config.example deploy/deploy.config
```

2. Edit `deploy/deploy.config`:

```env
DEPLOY_HOST=5.189.147.227
DEPLOY_USER=root
DEPLOY_PATH=/opt/blog-cms
```

3. Deploy:

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy.sh
```

**What it does:**

1. `rsync` project to `DEPLOY_PATH` (excludes `.env`, `node_modules`, `.next`, `dist`)
2. SSH → runs `deploy/scripts/rebuild.sh` on the server

### Option B — GitHub Actions

Workflow: `.github/workflows/deploy.yml`  
Triggers: push to `main`, or manual **Run workflow**.

**Repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Required | Example |
|--------|----------|---------|
| `DEPLOY_HOST` | Yes | `5.189.147.227` |
| `DEPLOY_USER` | Yes | `root` |
| `DEPLOY_SSH_KEY` | Yes | Full private key |
| `DEPLOY_PATH` | No | `/opt/blog-cms` (default) |

**Create deploy SSH key:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/blog-cms-deploy -N ""
cat ~/.ssh/blog-cms-deploy.pub
# Add to VPS: ~/.ssh/authorized_keys

cat ~/.ssh/blog-cms-deploy
# Paste into GitHub secret DEPLOY_SSH_KEY (full private key, all lines)

# Optional: base64 avoids multiline paste issues in GitHub UI
base64 < ~/.ssh/blog-cms-deploy | tr -d '\n'
# Paste that single line into DEPLOY_SSH_KEY instead
```

**Verify before pushing** (must succeed or Actions will fail the same way):

```bash
ssh -i ~/.ssh/blog-cms-deploy -o IdentitiesOnly=yes root@YOUR_VPS_IP 'echo SSH OK'
```

In the Actions log, **Setup SSH** prints a key fingerprint — it must match:

```bash
ssh-keygen -l -f ~/.ssh/blog-cms-deploy
```

If fingerprint matches but **Verify SSH connection** still fails, the `.pub` is missing from `~/.ssh/authorized_keys` on the VPS for `DEPLOY_USER`.

**Fix “Permission denied (publickey)”** — the Actions log prints the exact public key line under *Public key offered to …*. On the VPS (Contabo console or your existing SSH session):

```bash
# As DEPLOY_USER (usually root)
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys   # paste the ssh-ed25519 AAAA... line from the Actions log
chmod 600 ~/.ssh/authorized_keys
```

Or from your Mac if you already have password/root access:

```bash
ssh-copy-id -i ~/.ssh/blog-cms-deploy.pub root@YOUR_VPS_IP
```

`DEPLOY_SSH_KEY` in GitHub must be the **private** half of that same key pair (`cat ~/.ssh/blog-cms-deploy`), not your personal `id_ed25519`.

**What Actions does:**

1. Checkout code
2. `rsync` to VPS (same excludes as `deploy.sh`)
3. Run `rebuild.sh` over SSH

### `rebuild.sh` (on the server)

```bash
bash /opt/blog-cms/deploy/scripts/rebuild.sh
```

Rebuilds `backend` and `frontend` Docker images, restarts containers, runs basic health checks on ports 3001 and 3002.

---

## Manual deployment

### Update code only (server already has repo)

```bash
cd /opt/blog-cms
git pull   # if using git on server
bash deploy/scripts/rebuild.sh
```

### Update code from Mac (no script)

Use the `rsync` command from [First-time setup](#1-copy-project-to-the-vps), then:

```bash
ssh root@YOUR_VPS_IP 'bash /opt/blog-cms/deploy/scripts/rebuild.sh'
```

### Backup `.env` before fixing mistakes

```bash
cp /opt/blog-cms/backend/.env /opt/blog-cms/backend/.env.bak
cp /opt/blog-cms/frontend/.env /opt/blog-cms/frontend/.env.bak
```

---

## Nginx and HTTPS

| Guide | When |
|-------|------|
| [nginx/blog-cms.conf.example](./nginx/blog-cms.conf.example) | IP, no domain — HTTP→HTTPS, self-signed |
| [SSL.md](./SSL.md) | HTTP-only IP, self-signed notes, domain + Let's Encrypt later |

**Install Nginx config:**

```bash
export VPS_IP=YOUR_VPS_IP
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/blog-cms.key \
  -out /etc/nginx/ssl/blog-cms.crt \
  -subj "/CN=${VPS_IP}" \
  -addext "subjectAltName=IP:${VPS_IP}"

sudo apt install -y nginx
sudo cp /opt/blog-cms/deploy/nginx/blog-cms.conf.example /etc/nginx/sites-available/blog-cms
sudo ln -sf /etc/nginx/sites-available/blog-cms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Open `https://YOUR_VPS_IP` and accept the browser warning (self-signed).

**Do not use** `https://YOUR_VPS_IP:3001` — SSL is on Nginx port **443**, not Docker ports.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS / login blocked | `FRONTEND_URL` and `CORS_ORIGINS` must match the exact browser URL |
| Login fails on HTTP | Set `COOKIE_SECURE=false` |
| Login fails after HTTPS | Use `https://` in all env URLs; `TRUST_PROXY=true` |
| `ERR_SSL_PROTOCOL_ERROR` on `:3001` | Don’t use HTTPS on Docker ports — use `https://IP/` via Nginx |
| `.env` reset after deploy | Don’t rsync `.env`; use `deploy.sh` or Actions (they exclude it) |
| Font 404s | Harmless — app uses Geist / system fonts |
| API won’t start | Check `MONGO_URI`, Atlas IP whitelist, `docker compose logs api` |
| 502 from Nginx | `docker compose ps` — ensure API/CMS containers are up |

### Logs

```bash
cd /opt/blog-cms/backend && docker compose logs -f api
cd /opt/blog-cms/frontend && docker compose logs -f web
```

### Health checks (on server)

```bash
curl -s http://127.0.0.1:3001/api/public/tags
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/
```
