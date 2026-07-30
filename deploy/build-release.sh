#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="${project_root}/dist"
release_archive="${project_root}/dist.tar.gz"
app_env="${APP_ENV_FILE:-${project_root}/deploy/app.env}"
admin_token_file="${ADMIN_TOKEN_FILE:-${project_root}/deploy/admin.token}"
target_goos="${TARGET_GOOS:-linux}"
target_goarch="${TARGET_GOARCH:-amd64}"
staging_dir="$(mktemp -d "${project_root}/.dist-build.XXXXXX")"

cleanup() {
  rm -rf "${staging_dir}"
}
trap cleanup EXIT

if [[ ! -r "${app_env}" ]]; then
  echo "configuration file is not readable: ${app_env}"
  echo "copy deploy/app.env.example to deploy/app.env and fill the required values"
  exit 1
fi
existing_admin_token=""
if [[ -r "${admin_token_file}" ]]; then
  IFS= read -r existing_admin_token < "${admin_token_file}" || true
fi
if (( ${#existing_admin_token} < 32 )); then
  command -v openssl >/dev/null 2>&1 || {
    echo "openssl is required to generate the admin token"
    exit 1
  }
  umask 077
  openssl rand -hex 32 > "${admin_token_file}"
fi

install -d \
  "${staging_dir}/server" \
  "${staging_dir}/XHBlogs/.next/standalone" \
  "${staging_dir}/deploy/nginx"

cd "${project_root}/server"
CGO_ENABLED=0 GOOS="${target_goos}" GOARCH="${target_goarch}" \
  go build -trimpath -ldflags="-s -w" \
  -o "${staging_dir}/server/blog-api" ./cmd/blog-api

cd "${project_root}/XHBlogs"
npm ci
npm run build

cp -a .next/standalone/. "${staging_dir}/XHBlogs/.next/standalone/"
install -d \
  "${staging_dir}/XHBlogs/.next/standalone/public" \
  "${staging_dir}/XHBlogs/.next/standalone/.next/static"
cp -a public/. "${staging_dir}/XHBlogs/.next/standalone/public/"
cp -a .next/static/. "${staging_dir}/XHBlogs/.next/standalone/.next/static/"

install -m 600 "${app_env}" "${staging_dir}/app.env"
install -m 600 "${admin_token_file}" "${staging_dir}/admin.token"
install -m 755 "${project_root}/deploy/release-start.sh" "${staging_dir}/start.sh"
install -m 755 "${project_root}/deploy/release-stop.sh" "${staging_dir}/stop.sh"
install -m 755 \
  "${project_root}/deploy/release-show-admin-token.sh" \
  "${staging_dir}/show-admin-token.sh"
install -m 755 "${project_root}/deploy/setup-rustfs.sh" "${staging_dir}/setup-rustfs.sh"
install -m 755 \
  "${project_root}/deploy/start-screen.sh" \
  "${project_root}/deploy/stop-screen.sh" \
  "${project_root}/deploy/run-api.sh" \
  "${project_root}/deploy/run-web.sh" \
  "${project_root}/deploy/show-admin-token.sh" \
  "${staging_dir}/deploy/"
install -m 644 \
  "${project_root}/deploy/rustfs-cors.json" \
  "${staging_dir}/deploy/rustfs-cors.json"
cp -a "${project_root}/deploy/nginx/." "${staging_dir}/deploy/nginx/"

rm -rf "${release_dir}" "${release_archive}"
mv "${staging_dir}" "${release_dir}"
trap - EXIT

tar -czf "${release_archive}" -C "${release_dir}" .

echo "Release package complete:"
echo "  directory: ${release_dir}"
echo "  archive:   ${release_archive}"
echo "  target:    ${target_goos}/${target_goarch}"
