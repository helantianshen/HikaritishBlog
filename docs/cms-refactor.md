# CMS 重构设计

## 目标

项目由“静态文件 + 本地 Python 管理器 + Git/平台构建部署”调整为：

- `XHBlogs`：唯一的 Next.js 应用，同时提供公开站点和 `/admin` 管理界面。
- `server`：Gin HTTP API，使用 GORM 访问 PostgreSQL。
- RustFS：只保存新上传的图片，使用 S3 兼容的预签名上传。
- Nginx：生产环境统一入口；公开站点对外，管理页和管理 API 可在部署时限制为局域网访问。

内容发布不再触发 Next.js 构建。保存或发布后，刷新页面即可从 HTTP API 读取最新内容。

## 进程

生产环境只需要两个应用进程：

1. Next.js：公开页面和管理页面。
2. Gin：公开查询 API、管理 CRUD API、图片上传签名。

PostgreSQL、RustFS 和 Nginx 作为基础设施，不计入项目应用进程。

## 数据模型

### articles

统一保存文章、碎碎念、动态和单页内容：

- `kind`: `post`、`chatter`、`moment`、`page`
- `status`: `draft`、`published`、`archived`
- `slug`: 公开访问标识，全表唯一
- `title`、`summary`、`mood`、`location`
- `cover_url`、`image_urls`
- `tags`
- `content_html`: 编辑器原始 HTML，仅管理端返回
- `rendered_html`: 后端清理后的安全 HTML，公开端只返回该字段
- `published_at`
- GORM 创建、更新、软删除时间

首次发布、重新发布，以及对已发布内容执行保存时都会写入一条
`article_revisions`，用于保留轻量历史版本。

### site_settings

单行设置，覆盖：

- 站点标题、作者、简介、头像、图标
- 导航标题和导航项
- 社交链接
- 背景图、默认封面、照片墙封面
- 音乐配置、弹幕、页脚徽章、备案信息
- 友链申请格式、公开评论配置、功能开关
- AI 猫助手的开关、模型、提示词与生成参数

密钥不放入该表。数据库密码、RustFS 密钥和第三方服务密钥只通过服务端环境变量配置。

### 独立集合

- `friends`
- `projects`
- `albums` / `photos`
- `assets`

`assets` 记录 RustFS 对象键、URL、MIME、大小和图片尺寸。历史外链无需进入该表，也无需迁移。

## HTTP API

公开接口：

- `GET /api/v1/public/settings`
- `GET /api/v1/public/articles`
- `GET /api/v1/public/articles/:slug`
- `GET /api/v1/public/friends`
- `GET /api/v1/public/projects`
- `GET /api/v1/public/albums`

管理接口：

- `GET/POST /api/v1/admin/articles`
- `GET/PUT/DELETE /api/v1/admin/articles/:id`
- `POST /api/v1/admin/articles/:id/publish`
- `POST /api/v1/admin/articles/:id/unpublish`
- `GET /api/v1/admin/articles/:id/revisions`
- `GET/PUT /api/v1/admin/settings`
- `GET/POST/PUT/DELETE /api/v1/admin/friends`
- `GET/POST/PUT/DELETE /api/v1/admin/projects`
- `GET/POST/PUT/DELETE /api/v1/admin/albums`
- `POST /api/v1/admin/assets/presign`
- `POST /api/v1/admin/assets/complete`
- `DELETE /api/v1/admin/assets/:id`

所有响应统一为：

```json
{
  "data": {}
}
```

错误响应统一为：

```json
{
  "error": {
    "code": "validation_error",
    "message": "可读错误信息"
  }
}
```

## 配置与部署约束

- 默认监听 `127.0.0.1`，由 Nginx 代理。
- GORM 在 API 启动时执行 `AutoMigrate`。
- Next.js 服务端读取 `API_INTERNAL_URL`，所有公开内容请求使用 `no-store`。
- 浏览器管理端通过同源 `/api/v1/admin/*` 访问，开发环境由 Next.js rewrite 转发到 Gin。
- RustFS 上传限制由 API 签名请求与完成校验共同执行。
- 不在仓库中写入任何真实账号、密码、Token 或服务器地址。
