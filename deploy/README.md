# 自有服务器部署

## 最终进程

项目应用只有两个常驻进程：

1. `hikaritish-api`：Gin + GORM，监听 `127.0.0.1:8080`。
2. `hikaritish-web`：Next.js standalone，监听 `127.0.0.1:3000`。

Nginx 是唯一公网入口。PostgreSQL 和 RustFS 与博客部署在同一台服务器，
应用分别通过 `127.0.0.1:5432` 和 `127.0.0.1:9000` 访问，不让内部流量绕行公网。
发布文章只写 PostgreSQL，不执行 Git 操作，也不重新构建 Next.js。

## 1. 准备目录和系统用户

示例约定代码位于 `/opt/hikaritish-blog/current`：

```bash
sudo useradd --system --home /opt/hikaritish-blog --shell /usr/sbin/nologin hikaritish
sudo install -d -o hikaritish -g hikaritish /opt/hikaritish-blog
sudo install -d -m 750 -o root -g hikaritish /etc/hikaritish-blog
```

把项目放到 `/opt/hikaritish-blog/current`。`screen` 脚本会自动按脚本所在位置定位项目，
因此如果换了目录，不需要再修改脚本内路径。

## 2. 配置环境变量

```bash
sudo install -m 640 -o root -g hikaritish deploy/api.env.example /etc/hikaritish-blog/api.env
sudo install -m 640 -o root -g hikaritish deploy/web.env.example /etc/hikaritish-blog/web.env
```

编辑两个文件：

- 默认数据库名为 `hikaritish_blog`。先创建数据库，再在 `DATABASE_URL` 中填写数据库账号和 URL 编码后的密码。
- `ADMIN_TOKEN` 至少 32 个字符，建议使用 `openssl rand -hex 32`；生产环境缺失或过短时 Gin 会拒绝启动。
- RustFS 内部端点为 `http://127.0.0.1:9000`，默认 bucket 为 `blog-images`，
  公开图片前缀为 `https://oss.guyuan-v.top/blog-images`。Access Key 和 Secret Key 仍需填写。
- `GEMINI_API_KEY`、`GITHUB_CLIENT_SECRET` 均为可选，仅保存在 Next 服务端。
- 不要把实际环境文件复制回仓库。

环境文件会被 Bash `source`，值中如果包含空格或 `#` 等 shell 特殊字符，需要正确加引号。

Gin 每次启动会运行 GORM `AutoMigrate` 并创建唯一的默认站点设置行。项目不会导入旧 Markdown 数据。

如果数据库尚未创建，可由 PostgreSQL 管理员执行：

```bash
sudo -u postgres createdb -O DB_USER hikaritish_blog
```

把 `DB_USER` 替换为实际数据库账号。GORM 负责建表，但不会自动创建 PostgreSQL 数据库本身。

## 3. 配置 RustFS

新图片由浏览器使用预签名 URL 直接 PUT 到 RustFS，所以 bucket 必须：

- 允许站点域名发起 `PUT`、`GET`、`HEAD` 跨域请求；
- 允许公众只读图片对象，或由你自己的图片域名/CDN代理读取；
- 不允许匿名写入。

先将 `rustfs-cors.json` 中的 `https://blog.example.com` 替换成真实站点源。对支持 S3 API 的 RustFS 可用 AWS CLI 应用：

```bash
aws --endpoint-url http://127.0.0.1:9000 \
  s3api put-bucket-cors \
  --bucket blog-images \
  --cors-configuration file://deploy/rustfs-cors.json
```

当前按 path-style 公开 RustFS，对象 URL 形如
`https://oss.guyuan-v.top/blog-images/images/...`。如果你的反向代理已经把
`oss.guyuan-v.top` 直接绑定到 bucket 根目录，则把 `RUSTFS_PUBLIC_BASE_URL`
改成 `https://oss.guyuan-v.top`。旧外链只是数据库中的普通 URL，不受该配置影响。

## 4. 构建

服务器需要 Go、Node.js 和 npm。执行：

```bash
./deploy/build-release.sh
```

脚本会：

- 编译 `server/blog-api`；
- 执行 `npm ci` 和 `next build`；
- 把 `public` 与 `.next/static` 复制进 standalone 产物。

只有部署代码更新时需要运行这一步。管理端保存或发布内容不需要运行。

## 5. 使用 screen 启动

先安装 `screen`，然后使用应用用户启动两个会话：

```bash
sudo -u hikaritish /opt/hikaritish-blog/current/deploy/start-screen.sh
```

查看会话和日志：

```bash
sudo -u hikaritish screen -ls
sudo -u hikaritish screen -r hikaritish-api
sudo -u hikaritish screen -r hikaritish-web
```

进入会话后按 `Ctrl+A`、再按 `D` 可退出而不停止进程。HTTP 检查：

```bash
curl http://127.0.0.1:8080/healthz
curl -I http://127.0.0.1:3000/
```

`screen` 不负责开机自启。服务器重启后，需要再次执行
`deploy/start-screen.sh`；如果以后需要自动拉起，可再单独放进现有的启动任务。

## 6. 安装 Nginx 入口

修改 `deploy/nginx/blog.conf` 的 `server_name`，然后：

```bash
sudo install -m 644 deploy/nginx/blog.conf /etc/nginx/conf.d/hikaritish-blog.conf
sudo nginx -t
sudo nginx -s reload
```

TLS 证书按服务器现有方案配置。Gin 与 Next 均绑定回环地址，不应直接暴露 3000/8080 端口。

当前配置暂不猜测局域网网段，`/admin` 仍由 `ADMIN_TOKEN` 保护。确定实际 CIDR 后，参考 `admin-lan-snippet.conf.example` 同时限制：

- `/admin`
- `/api/v1/admin/`

不能只限制管理页面，否则管理 API 仍可能从公网被探测。

## 7. 首次使用

1. 打开 `/admin`。
2. 输入与 Gin `ADMIN_TOKEN` 相同的令牌；浏览器只保存在当前标签页的 `sessionStorage`。
3. 先填写站点资料、导航、社交、背景和可选集成。
4. 新建 slug 为 `about` 的“关于我”页面并发布。
5. 新建文章并保存草稿或正式发布。
6. 刷新公开页面验证更新。

## 常用运维

```bash
sudo -u hikaritish screen -ls
sudo -u hikaritish /opt/hikaritish-blog/current/deploy/stop-screen.sh
sudo -u hikaritish /opt/hikaritish-blog/current/deploy/start-screen.sh
```

代码发布建议顺序：

1. 更新代码；
2. 执行 `deploy/build-release.sh`；
3. 用 `stop-screen.sh` 和 `start-screen.sh` 重启两个会话；
4. 检查 `/healthz` 和首页。

数据库与 RustFS 需要独立备份。删除后台图片会同时删除 RustFS 对象，这是不可恢复操作；文章、友链、项目和相册使用 GORM 软删除。
