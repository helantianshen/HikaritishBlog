# 最简部署

采用“本地构建、上传发布包”的方式。服务器不保存源码，也不需要安装 Go、npm、
AWS CLI 或单独的 Nginx。

博客应用只有两个常驻进程：

- Gin API：`127.0.0.1:8080`
- Next.js standalone：`127.0.0.1:3000`

两个进程由 `screen` 启动。1Panel 管理的 OpenResty 是公网唯一入口；PostgreSQL
保存文章和站点资料，RustFS 保存新图片。管理端发布内容后，刷新公开页面即可看到
更新，不需要重新构建。

## 1. 已固定的配置

项目中的 `deploy/app.env` 是唯一配置文件，构建时会自动放入发布包。当前只保留：

```env
DATABASE_URL='postgres://数据库账号:数据库密码@127.0.0.1:5432/hikaritish_blog?sslmode=disable'
RUSTFS_ACCESS_KEY=RustFS访问密钥
RUSTFS_SECRET_KEY=RustFS私密密钥
```

其余参数已在启动脚本中固定：

- RustFS 内部初始化地址：`http://127.0.0.1:9000`
- RustFS 外部上传地址：`https://oss.guyuan-v.top`
- bucket：`blog-images`
- 图片公开前缀：`https://oss.guyuan-v.top/blog-images`
- Gin：`127.0.0.1:8080`
- Next.js：`127.0.0.1:3000`
- 单张图片上限：10 MiB

管理令牌会在第一次构建时生成到 `deploy/admin.token`，后续构建继续复用。

## 2. 本地构建

构建机需要 Go 1.26、Node.js 20.9+、npm 和 `openssl`：

```bash
./deploy/build-release.sh
```

输出：

```text
dist/          可直接运行的完整发布目录
dist.tar.gz    用于上传服务器的压缩包
```

Gin 默认编译为 Linux amd64 静态二进制，Next.js 使用 standalone 产物。

## 3. 上传服务器

服务器只需要：

- PostgreSQL 和 RustFS 已启动
- Node.js 20.9+
- `screen`
- 1Panel 已安装并管理 OpenResty

上传并解压：

```bash
scp dist.tar.gz 用户@服务器:/tmp/
ssh 用户@服务器

sudo install -d -o "$USER" -g "$USER" /opt/hikaritish-blog
tar -xzf /tmp/dist.tar.gz -C /opt/hikaritish-blog
cd /opt/hikaritish-blog
```

PostgreSQL 中需要存在 `hikaritish_blog` 数据库。首次启动时 GORM 会自动建表，不需要
另跑迁移程序。

## 4. 初始化 RustFS

确认 RustFS 的 S3 API 正在监听本机 `9000` 端口：

```bash
curl -I http://127.0.0.1:9000/
```

第一次部署执行：

```bash
./setup-rustfs.sh
```

不需要 AWS CLI。脚本直接使用 `blog-api` 内置的 S3 客户端：

1. 检查 `blog-images`，缺失时才创建。
2. 更新浏览器直传所需的 CORS。
3. 更新该 bucket 的对象匿名只读策略。

脚本不会列出、删除、清空或覆盖图片对象，可以重复执行。日常 `start.sh` 和
`stop.sh` 都不会调用它，所以重启博客服务不会改动 RustFS。RustFS 自身的数据是否
持久化，取决于它启动时配置的数据目录；不要删除该目录或把它改到临时目录。

## 5. 在 1Panel 配置 OpenResty

不需要安装 `deploy/nginx/*.conf`。在 1Panel 的“网站”中手动创建两个“反向代理”
网站。

### 博客网站

- 主域名：你的博客域名
- 代理地址：`http://127.0.0.1:3000`
- 配置 HTTPS 并启用 HTTP 跳转 HTTPS

管理后台就是 `https://你的博客域名/admin`，不需要第三个进程或单独的后台站点。
不要把 `8080` 配置成公网网站；Next.js 会在服务器内部把 `/api/v1` 转发给 Gin。

### 图片网站

- 主域名：`oss.guyuan-v.top`
- 代理地址：`http://127.0.0.1:9000`
- 配置 HTTPS 并启用 HTTP 跳转 HTTPS

先确保 `oss.guyuan-v.top` 的 DNS 已指向这台服务器。在该网站的 OpenResty 配置中：

- 在 `server` 块中设置 `client_max_body_size 12m;`
- 保留 1Panel 自动生成的反向代理内容
- 确认其中只有一条 `proxy_set_header Host $host;`

不要重复创建第二个 `location /`，也不要重复添加已有的 `proxy_set_header Host`。
`deploy/nginx/oss.conf` 仅作为配置内容参考。保留原始 Host 很重要，因为浏览器上传
使用的是带签名的 S3 URL。浏览器的预签名上传使用公网 OSS 域名；Gin 对图片的校验
和删除则通过本机 `127.0.0.1:9000` 完成，不会绕行 Cloudflare。

如果 1Panel 的 OpenResty 无法访问 `127.0.0.1`，再把代理地址改成服务器的宿主机或
局域网 IP；无需在防火墙中公开 `3000`、`8080`、`9000`。

## 6. 启动与检查

```bash
cd /opt/hikaritish-blog
./start.sh
./show-admin-token.sh
```

第二条命令显示管理端登录令牌。检查两个进程：

```bash
screen -ls
curl http://127.0.0.1:8080/healthz
curl -I http://127.0.0.1:3000/
```

再检查公网入口：

```bash
curl -I https://你的博客域名/
curl -I https://oss.guyuan-v.top/
```

停止应用：

```bash
./stop.sh
```

## 后续更新

本地重新构建并上传新的 `dist.tar.gz`，服务器执行：

```bash
cd /opt/hikaritish-blog
./stop.sh
tar -xzf /tmp/dist.tar.gz -C /opt/hikaritish-blog
./start.sh
```

更新应用不需要再次初始化 RustFS。替换发布目录只会替换应用文件，不会改动
PostgreSQL 或 RustFS 中的数据。
