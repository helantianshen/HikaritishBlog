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
