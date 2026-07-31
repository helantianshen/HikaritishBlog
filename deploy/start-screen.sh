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
api_session="${API_SCREEN_NAME:-hikaritish-api}"
web_session="${WEB_SCREEN_NAME:-hikaritish-web}"

command -v screen >/dev/null 2>&1 || {
  echo "screen is not installed"
  exit 1
}
command -v node >/dev/null 2>&1 || {
  echo "node is not available in this login shell"
  exit 1
}

for session_name in "${api_session}" "${web_session}"; do
  if [[ ! "${session_name}" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "invalid screen session name: ${session_name}"
    exit 1
  fi
done

if [[ ! -r "${app_env}" ]]; then
  echo "configuration file is not readable: ${app_env}"
  echo "copy deploy/app.env.example to deploy/app.env and fill the required values"
  exit 1
fi

api_bin="${project_root}/server/blog-api"
web_entry="${project_root}/XHBlogs/.next/standalone/server.js"
api_runner="${project_root}/deploy/run-api.sh"
web_runner="${project_root}/deploy/run-web.sh"

for artifact in "${api_bin}" "${web_entry}" "${api_runner}" "${web_runner}"; do
  if [[ ! -f "${artifact}" ]]; then
    echo "release artifact is missing: ${artifact}"
    echo "run deploy/build-release.sh first"
    exit 1
  fi
done

if screen -list | grep -q "[.]${api_session}[[:space:]]"; then
  echo "screen session already exists: ${api_session}"
  exit 1
fi
if screen -list | grep -q "[.]${web_session}[[:space:]]"; then
  echo "screen session already exists: ${web_session}"
  exit 1
fi

screen -dmS "${api_session}" env \
  RELEASE_ROOT="${project_root}" \
  APP_ENV_FILE="${app_env}" \
  ADMIN_TOKEN_FILE="${admin_token_file}" \
  "${api_runner}"
screen -dmS "${web_session}" env \
  RELEASE_ROOT="${project_root}" \
  APP_ENV_FILE="${app_env}" \
  "${web_runner}"

sleep 1
for session_name in "${api_session}" "${web_session}"; do
  if ! screen -list | grep -q "[.]${session_name}[[:space:]]"; then
    echo "screen session exited during startup: ${session_name}"
    echo "run its command in the foreground to inspect the error"
    for started_session in "${web_session}" "${api_session}"; do
      if screen -list | grep -q "[.]${started_session}[[:space:]]"; then
        screen -S "${started_session}" -X quit || true
      fi
    done
    exit 1
  fi
done

echo "Started screen sessions:"
screen -list
echo "Read the admin token with: ${project_root}/deploy/show-admin-token.sh"
