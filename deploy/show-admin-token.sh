#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_root="${RELEASE_ROOT:-${source_root}}"
app_env="${APP_ENV_FILE:-${project_root}/deploy/app.env}"
admin_token_file="${ADMIN_TOKEN_FILE:-${project_root}/deploy/admin.token}"

if [[ -r "${app_env}" ]]; then
  set +a
  # shellcheck disable=SC1090
  source "${app_env}"
fi

configured_admin_token="${ADMIN_TOKEN:-}"
if (( ${#configured_admin_token} >= 32 )); then
  printf '%s\n' "${configured_admin_token}"
elif [[ -r "${admin_token_file}" ]]; then
  head -n 1 "${admin_token_file}"
else
  echo "admin token has not been generated; start the application first" >&2
  exit 1
fi
