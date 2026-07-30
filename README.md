# Hikaritish Blog

这是一个面向单人管理的动态博客：

- `XHBlogs`：Next.js 公开站点与 `/admin` 管理后台。
- `server`：Gin HTTP API、GORM 与 PostgreSQL。
- RustFS：保存新上传的图片。
- Nginx：自有服务器统一入口。

文章和站点配置保存在 PostgreSQL。管理端保存或发布后，公开页面刷新即读取最新数据，不需要重新构建，不使用 WebSocket/SSE，也不再依赖 Python CMS、双目录同步、Git 推送或 Vercel 构建。

## 运行结构

```text
浏览器
  │
  ▼
Nginx :80/:443
  │
  ▼
Next.js :3000 ──HTTP──▶ Gin :8080 ──GORM──▶ PostgreSQL
     │                    │
     └─ /admin            └─预签名上传──▶ RustFS
```

项目应用只需两个进程：Next.js 和 Gin。生产环境使用两个 `screen` 会话运行。

## 本地开发

要求：

- Go（版本以 `server/go.mod` 为准）
- Node.js 与 npm
- PostgreSQL
- 可选 RustFS；未配置时只有图片上传接口返回 503，其余功能可开发

准备环境文件：

```bash
cp server/.env.example server/.env
cp XHBlogs/.env.example XHBlogs/.env.local
```

只在本机环境文件中填写真实数据库密码、管理令牌和第三方密钥，不要提交这些文件。

启动 Gin：

```bash
cd server
set -a
source .env
set +a
go run ./cmd/blog-api
```

另开终端启动 Next.js：

```bash
cd XHBlogs
npm ci
npm run dev
```

访问：

- 公开站：`http://127.0.0.1:3000`
- 管理端：`http://127.0.0.1:3000/admin`
- API 健康检查：`http://127.0.0.1:8080/healthz`

Gin 启动时自动执行 GORM `AutoMigrate`。不会导入仓库历史 Markdown；首次进入管理端后直接创建新内容和站点资料即可。

## 内容管理

管理端支持：

- 文章、杂谈、说说、关于我
- 草稿、发布、撤回、软删除与发布修订列表
- 站点资料、导航、社交、背景、音乐、弹幕、评论和 AI 猫配置
- 友链、项目、相册与照片
- RustFS 图片上传、复制 URL 和删除

编辑器原始 HTML 仅管理接口返回。Gin 会生成经过白名单清理的 HTML，公开接口只返回安全版本。

旧图片外链可继续直接填写。新图片使用 RustFS 预签名 PUT；项目不处理视频。

## 验证

```bash
cd server
go test ./...
go vet ./...

cd ../XHBlogs
npx tsc --noEmit
npm run build
```

## 自有服务器部署

完整说明见 [deploy/README.md](deploy/README.md)，其中包含：

- 环境变量模板
- PostgreSQL/GORM 启动约束
- RustFS CORS 示例
- standalone 构建脚本
- 两个 `screen` 会话的启动/停止脚本
- Nginx 配置
- 后续限制 `/admin` 与管理 API 局域网网段的位置

当前不会猜测你的局域网 CIDR。生产环境至少必须配置长随机 `ADMIN_TOKEN`，并让 Gin/Next 只监听回环地址。

## 设计说明

API、数据模型和安全边界见 [docs/cms-refactor.md](docs/cms-refactor.md)。
