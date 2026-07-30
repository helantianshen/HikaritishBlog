#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_root="${RELEASE_ROOT:-${source_root}}"
app_env="${APP_ENV_FILE:-${project_root}/deploy/app.env}"
web_dir="${project_root}/XHBlogs/.next/standalone"
web_entry="${web_dir}/server.js"

if [[ ! -r "${app_env}" ]]; then
  echo "configuration file is not readable: ${app_env}"
  exit 1
fi
if [[ ! -f "${web_entry}" ]]; then
  echo "Next.js standalone entry is missing: ${web_entry}"
  echo "run deploy/build-release.sh first"
  exit 1
fi

set +a
# shellcheck disable=SC1090
source "${app_env}"

# Never pass API, database, or RustFS credentials into the Next.js process.
unset DATABASE_URL ADMIN_TOKEN RUSTFS_ACCESS_KEY RUSTFS_SECRET_KEY

web_host="${WEB_HOST:-127.0.0.1}"
web_port="${WEB_PORT:-3000}"
api_internal_url="${API_INTERNAL_URL:-http://127.0.0.1:8080}"
api_proxy_url="${API_PROXY_URL:-${api_internal_url}}"

cd "${web_dir}"
exec env \
  NODE_ENV=production \
  HOSTNAME="${web_host}" \
  PORT="${web_port}" \
  API_INTERNAL_URL="${api_internal_url}" \
  API_PROXY_URL="${api_proxy_url}" \
  GEMINI_API_KEY="${GEMINI_API_KEY:-}" \
  GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET:-}" \
  node server.js
