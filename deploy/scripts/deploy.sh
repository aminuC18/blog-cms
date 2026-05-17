#!/usr/bin/env bash
# Deploy from your Mac: rsync code to Contabo + rebuild Docker (keeps server .env files).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${REPO_ROOT}/deploy/deploy.config"

if [[ -f "${CONFIG_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${CONFIG_FILE}"
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy/deploy.config (copy deploy.config.example)}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/blog-cms}"
SSH_OPTS="${SSH_OPTS:--o StrictHostKeyChecking=accept-new}"

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude .next
  --exclude dist
  --exclude .git
  --exclude 'backend/.env'
  --exclude 'frontend/.env'
  --exclude deploy/deploy.config
)

echo "==> Syncing to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
rsync -avz --delete "${RSYNC_EXCLUDES[@]}" \
  -e "ssh ${SSH_OPTS}" \
  "${REPO_ROOT}/" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> Rebuilding on server..."
ssh ${SSH_OPTS} "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "DEPLOY_PATH='${DEPLOY_PATH}' bash '${DEPLOY_PATH}/deploy/scripts/rebuild.sh'"

echo "Deploy finished."
