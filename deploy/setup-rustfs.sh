#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -x "${script_dir}/server/blog-api" && -x "${script_dir}/deploy/run-api.sh" ]]; then
  release_root="${RELEASE_ROOT:-${script_dir}}"
  app_env="${APP_ENV_FILE:-${release_root}/app.env}"
  admin_token_file="${ADMIN_TOKEN_FILE:-${release_root}/admin.token}"
else
  release_root="${RELEASE_ROOT:-$(cd "${script_dir}/.." && pwd)}"
  app_env="${APP_ENV_FILE:-${release_root}/deploy/app.env}"
  admin_token_file="${ADMIN_TOKEN_FILE:-${release_root}/deploy/admin.token}"
fi

exec env \
  RELEASE_ROOT="${release_root}" \
  APP_ENV_FILE="${app_env}" \
  ADMIN_TOKEN_FILE="${admin_token_file}" \
  RUSTFS_ADMIN_ENDPOINT="${RUSTFS_ADMIN_ENDPOINT:-http://127.0.0.1:9000}" \
  "${release_root}/deploy/run-api.sh" init-storage
