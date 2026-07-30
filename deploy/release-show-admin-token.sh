#!/usr/bin/env bash
set -euo pipefail

release_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec env \
  RELEASE_ROOT="${release_root}" \
  APP_ENV_FILE="${release_root}/app.env" \
  ADMIN_TOKEN_FILE="${release_root}/admin.token" \
  "${release_root}/deploy/show-admin-token.sh"
