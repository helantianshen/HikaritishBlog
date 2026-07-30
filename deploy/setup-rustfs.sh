#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${script_dir}/deploy/rustfs-cors.json" ]]; then
  release_root="${script_dir}"
  default_app_env="${release_root}/app.env"
else
  release_root="${RELEASE_ROOT:-$(cd "${script_dir}/.." && pwd)}"
  default_app_env="${release_root}/deploy/app.env"
fi

app_env="${APP_ENV_FILE:-${default_app_env}}"
cors_file="${release_root}/deploy/rustfs-cors.json"

if [[ ! -r "${app_env}" ]]; then
  echo "configuration file is not readable: ${app_env}"
  exit 1
fi
command -v aws >/dev/null 2>&1 || {
  echo "AWS CLI is required"
  exit 1
}

set +a
# shellcheck disable=SC1090
source "${app_env}"

rustfs_admin_endpoint="${RUSTFS_ADMIN_ENDPOINT:-http://127.0.0.1:9000}"
rustfs_bucket="${RUSTFS_BUCKET:-blog-images}"

if [[ -z "${RUSTFS_ACCESS_KEY:-}" || -z "${RUSTFS_SECRET_KEY:-}" ]]; then
  echo "RUSTFS_ACCESS_KEY and RUSTFS_SECRET_KEY are required in ${app_env}"
  exit 1
fi
if [[ ! "${rustfs_bucket}" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "invalid RustFS bucket name: ${rustfs_bucket}"
  exit 1
fi

export AWS_ACCESS_KEY_ID="${RUSTFS_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${RUSTFS_SECRET_KEY}"
export AWS_DEFAULT_REGION="${RUSTFS_REGION:-us-east-1}"

if ! aws --endpoint-url "${rustfs_admin_endpoint}" s3api head-bucket \
  --bucket "${rustfs_bucket}" >/dev/null 2>&1; then
  aws --endpoint-url "${rustfs_admin_endpoint}" s3api create-bucket \
    --bucket "${rustfs_bucket}"
fi

aws --endpoint-url "${rustfs_admin_endpoint}" s3api put-bucket-cors \
  --bucket "${rustfs_bucket}" \
  --cors-configuration "file://${cors_file}"

policy_file="$(mktemp)"
trap 'rm -f "${policy_file}"' EXIT
printf \
  '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}\n' \
  "${rustfs_bucket}" > "${policy_file}"

aws --endpoint-url "${rustfs_admin_endpoint}" s3api put-bucket-policy \
  --bucket "${rustfs_bucket}" \
  --policy "file://${policy_file}"

echo "RustFS bucket is ready: ${rustfs_bucket}"
