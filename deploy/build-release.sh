#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${project_root}/server"
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o blog-api ./cmd/blog-api

cd "${project_root}/XHBlogs"
npm ci
npm run build

# Next.js standalone 不会自动复制这两个静态目录。
install -d .next/standalone/public .next/standalone/.next/static
cp -a public/. .next/standalone/public/
cp -a .next/static/. .next/standalone/.next/static/

echo "Release build complete:"
echo "  API:  ${project_root}/server/blog-api"
echo "  Web:  ${project_root}/XHBlogs/.next/standalone/server.js"
