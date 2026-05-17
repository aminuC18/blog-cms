#!/usr/bin/env bash
# Run on the VPS after code is updated (git pull or rsync).
set -euo pipefail

ROOT="${DEPLOY_PATH:-/opt/blog-cms}"

if [[ ! -d "${ROOT}/backend" || ! -d "${ROOT}/frontend" ]]; then
  echo "Missing ${ROOT}/backend or ${ROOT}/frontend"
  exit 1
fi

echo "==> Rebuilding API..."
cd "${ROOT}/backend"
docker compose up -d --build

echo "==> Rebuilding CMS..."
cd "${ROOT}/frontend"
docker compose up -d --build

echo "==> Health checks..."
sleep 5
curl -sf "http://127.0.0.1:3001/api/public/tags" >/dev/null && echo "API OK" || echo "API check failed"
curl -sf -o /dev/null "http://127.0.0.1:3002/" && echo "CMS OK" || echo "CMS check failed"

docker compose -f "${ROOT}/backend/docker-compose.yml" ps
docker compose -f "${ROOT}/frontend/docker-compose.yml" ps

echo "Done."
