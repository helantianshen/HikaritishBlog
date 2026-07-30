#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_env="${API_ENV_FILE:-/etc/hikaritish-blog/api.env}"
web_env="${WEB_ENV_FILE:-/etc/hikaritish-blog/web.env}"
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

for env_file in "${api_env}" "${web_env}"; do
  if [[ ! -r "${env_file}" ]]; then
    echo "environment file is not readable: ${env_file}"
    exit 1
  fi
done

api_bin="${project_root}/server/blog-api"
web_dir="${project_root}/XHBlogs/.next/standalone"
web_entry="${web_dir}/server.js"

for artifact in "${api_bin}" "${web_entry}"; do
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

printf -v api_env_q "%q" "${api_env}"
printf -v api_bin_q "%q" "${api_bin}"
api_command="set -a; source ${api_env_q}; set +a; exec ${api_bin_q}"

printf -v web_env_q "%q" "${web_env}"
printf -v web_dir_q "%q" "${web_dir}"
web_command="set -a; source ${web_env_q}; set +a; cd ${web_dir_q}; exec node server.js"

screen -DmS "${api_session}" bash -lc "${api_command}"
screen -DmS "${web_session}" bash -lc "${web_command}"

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
