# 站点部署说明

本站点采用 docsify：不构建、不生成静态产物，直接把仓库根目录作为网站根目录即可。

- `index.html`：站点入口与 docsify 配置
- `_sidebar.md`：左侧导航
- `docsify/`：docsify 运行时与主题（已本地化，不依赖外部 CDN）
- 各 `.md` 文件：页面正文，与 GitHub 上浏览的是同一份文件

> 修改文档后无需重新构建，浏览器刷新即可生效。只有更换主题或升级 docsify 时才需要改动 `docsify/` 目录。

## 一、本地预览

站点必须通过 HTTP 访问，直接双击 `index.html`（`file://` 协议）无法加载。在仓库根目录执行：

```bash
python -m http.server 8123
# 或
npx --yes serve -l 8123
```

然后浏览器打开 <http://127.0.0.1:8123/>。预览完成后按 `Ctrl+C` 结束。

## 二、上传文件

请将仓库完整克隆或同步至服务器，例如 `/var/www/pi-handbook`。

**方式 A：服务器直接拉取（推荐，后续更新简单）**

```bash
sudo mkdir -p /var/www && sudo chown "$USER" /var/www
git clone https://github.com/Yukikaze166/pi-handbook /var/www/pi-handbook
```

**方式 B：本地推送产物**（服务器访问 GitHub 缓慢时使用）

```powershell
rsync -avz --exclude '.git' --exclude '.pi' --exclude 'node_modules' `
  D:\aCode\pi-handbook\ user@server:/var/www/pi-handbook/
```

后续更新：方式 A 在服务器执行 `git pull`；方式 B 重复上述命令。

## 三、反向代理配置

服务器位于香港或海外，无需备案，可直接绑定域名并启用 HTTPS。任选一种：

- **Caddy**（自动签发与续期证书，配置最短）：见 `deploy/Caddyfile.example`
- **nginx**：见 `deploy/nginx.conf.example`，证书可用 `certbot` 或云厂商免费 DV 证书

两种配置均包含以下安全项：

- 禁止访问 `.git/`，避免仓库历史被下载
- 禁止访问 `.pi/`（本地临时目录）
- `config/` 目录可公开浏览（内容与公开仓库一致）；如需隐藏，取消配置中对应注释放开即可

## 四、验证

```bash
curl -I https://你的域名/
curl -I https://你的域名/windows.md
```

预期均返回 `200`。浏览器打开域名后应看到：左侧导航、首页「秋风 pi 配置手册」、右上角搜索框与仓库链接。

## 五、常见问题

**页面一直显示「正在加载…」**：`docsify/docsify.min.js` 未上传完整，或 nginx 未正确返回 `.js` 文件。检查浏览器控制台的 404 报错。

**侧边栏不显示**：`_sidebar.md` 未上传，或 docsify 配置中 `loadSidebar` 未开启。

**点击导航跳转后空白**：对应的 `.md` 文件名大小写不匹配。Linux 文件系统区分大小写，导航中的名称必须与实际文件名完全一致。

**主题切换为深色**：将 `index.html` 中的 `docsify/vue.css` 改为 `docsify/dark.css`。
