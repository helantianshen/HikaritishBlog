#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_root="${RELEASE_ROOT:-${source_root}}"
default_app_env="${project_root}/deploy/app.env"
default_admin_token_file="${project_root}/deploy/admin.token"
if [[ -r "${project_root}/app.env" ]]; then
  default_app_env="${project_root}/app.env"
  default_admin_token_file="${project_root}/admin.token"
fi
app_env="${APP_ENV_FILE:-${default_app_env}}"
admin_token_file="${ADMIN_TOKEN_FILE:-${default_admin_token_file}}"
api_bin="${project_root}/server/blog-api"

if [[ ! -r "${app_env}" ]]; then
  echo "configuration file is not readable: ${app_env}"
  echo "copy deploy/app.env.example to deploy/app.env and fill the required values"
  exit 1
fi
if [[ ! -x "${api_bin}" ]]; then
  echo "API binary is missing: ${api_bin}"
  echo "run deploy/build-release.sh first"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${app_env}"
set +a

export APP_ENV="${APP_ENV:-production}"
export HTTP_ADDR="${HTTP_ADDR:-127.0.0.1:8080}"
export SHUTDOWN_TIMEOUT="${SHUTDOWN_TIMEOUT:-10s}"
export CORS_ORIGINS="${CORS_ORIGINS:-}"
export RUSTFS_ENDPOINT="${RUSTFS_ENDPOINT:-https://oss.guyuan-v.top}"
export RUSTFS_INTERNAL_ENDPOINT="${RUSTFS_INTERNAL_ENDPOINT:-${RUSTFS_ADMIN_ENDPOINT:-http://127.0.0.1:9000}}"
export RUSTFS_REGION="${RUSTFS_REGION:-us-east-1}"
export RUSTFS_BUCKET="${RUSTFS_BUCKET:-blog-images}"
export RUSTFS_PUBLIC_BASE_URL="${RUSTFS_PUBLIC_BASE_URL:-${RUSTFS_ENDPOINT%/}/${RUSTFS_BUCKET}}"
export RUSTFS_USE_PATH_STYLE="${RUSTFS_USE_PATH_STYLE:-true}"
export MAX_IMAGE_BYTES="${MAX_IMAGE_BYTES:-10485760}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required in ${app_env}"
  exit 1
fi
if [[ -z "${RUSTFS_ACCESS_KEY:-}" || -z "${RUSTFS_SECRET_KEY:-}" ]]; then
  echo "RUSTFS_ACCESS_KEY and RUSTFS_SECRET_KEY are required in ${app_env}"
  exit 1
fi

configured_admin_token="${ADMIN_TOKEN:-}"
if (( ${#configured_admin_token} < 32 )); then
  generated_token=""
  if [[ -r "${admin_token_file}" ]]; then
    IFS= read -r generated_token < "${admin_token_file}" || true
  fi
  if (( ${#generated_token} < 32 )); then
    command -v openssl >/dev/null 2>&1 || {
      echo "openssl is required to generate the admin token"
      exit 1
    }
    umask 077
    generated_token="$(openssl rand -hex 32)"
    printf '%s\n' "${generated_token}" > "${admin_token_file}"
    chmod 600 "${admin_token_file}"
    echo "generated admin token: ${admin_token_file}"
  fi
  export ADMIN_TOKEN="${generated_token}"
fi

exec "${api_bin}" "$@"
