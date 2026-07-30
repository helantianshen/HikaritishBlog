# 最简部署

采用“本地构建、上传发布包”的方式。服务器不保存源码，也不需要安装 Go 或 npm。

应用仍然只有两个常驻进程：

- Gin API：`127.0.0.1:8080`
- Next.js standalone：`127.0.0.1:3000`

两个进程由 `screen` 启动，Nginx 是唯一入口。文章和站点配置写入 PostgreSQL，
新图片写入 RustFS；发布内容后刷新页面即可看到更新，不需要重新构建。

## 1. 配置

唯一配置文件是项目中的 `deploy/app.env`，当前仓库已经配置完成，构建时会自动放进
发布包。文件只保留这三项：

```env
DATABASE_URL='postgres://数据库账号:数据库密码@127.0.0.1:5432/hikaritish_blog?sslmode=disable'
RUSTFS_ACCESS_KEY=RustFS访问密钥
RUSTFS_SECRET_KEY=RustFS私密密钥
```

当前服务器参数已有默认值：

- RustFS 上传端点：`https://oss.guyuan-v.top`
- bucket：`blog-images`
- 图片地址前缀：`https://oss.guyuan-v.top/blog-images`
- Gin：`127.0.0.1:8080`
- Next.js：`127.0.0.1:3000`

管理令牌会在第一次构建时自动生成并保存到 `deploy/admin.token`，后续构建继续复用。

## 2. 本地构建发布包

构建机需要 Go 1.26、Node.js 20.9+、npm 和 `openssl`：

```bash
./deploy/build-release.sh
```

输出：

```text
dist/          可直接运行的完整发布目录
dist.tar.gz    用于上传服务器的压缩包
```

Gin 默认编译为 Linux amd64 静态二进制。Next.js 使用 standalone 产物。

## 3. 上传服务器

服务器只需要 Node.js 20.9+、`screen`、Nginx 和一次性配置 RustFS 所需的 AWS CLI。

```bash
scp dist.tar.gz 用户@服务器:/tmp/
ssh 用户@服务器

sudo install -d -o "$USER" -g "$USER" /opt/hikaritish-blog
tar -xzf /tmp/dist.tar.gz -C /opt/hikaritish-blog
cd /opt/hikaritish-blog
```

确保 PostgreSQL 已经存在数据库；GORM 会自动建表：

```bash
sudo -u postgres createdb -O '数据库账号' hikaritish_blog
```

如果数据库已经存在，这一步不用重复执行。

## 4. 初始化 RustFS

第一次部署执行一次：

```bash
./setup-rustfs.sh
```

脚本会自动创建 `blog-images`、应用图片跨域规则，并设置对象匿名只读。
匿名写入仍然禁止，上传依靠管理 API 生成的预签名 URL。

安装两个 Nginx 配置：

```bash
sudo install -m 644 deploy/nginx/blog.conf /etc/nginx/conf.d/hikaritish-blog.conf
sudo install -m 644 deploy/nginx/oss.conf /etc/nginx/conf.d/hikaritish-oss.conf
sudo nginx -t
sudo nginx -s reload
```

博客配置默认接受服务器 IP 或任意域名。`oss.conf` 已固定为
`oss.guyuan-v.top`；还需要按服务器现有方式为该域名配置 HTTPS。

## 5. 启动

```bash
./start.sh
./show-admin-token.sh
```

第二条命令显示管理端登录令牌。检查：

```bash
screen -ls
curl http://127.0.0.1:8080/healthz
curl -I http://127.0.0.1:3000/
```

打开 `http://服务器地址/admin`，输入管理令牌即可编辑内容。

停止：

```bash
./stop.sh
```

## 后续更新

在本地重新运行 `./deploy/build-release.sh` 并上传新的 `dist.tar.gz`。服务器上：

```bash
cd /opt/hikaritish-blog
./stop.sh
tar -xzf /tmp/dist.tar.gz -C /opt/hikaritish-blog
./start.sh
```

`app.env` 和管理令牌已经包含在发布包中，不需要在服务器再次编辑。
数据库与 RustFS 内容不会因替换发布包而变化。
