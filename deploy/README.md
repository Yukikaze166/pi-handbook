# 站点部署说明

线上地址：<https://pibook.akikaze.top/>

托管方式：Cloudflare Pages 项目 `pibook`，Git 集成 `Yukikaze166/pi-handbook`，`main` 分支推送即自动部署。没有自建服务器，也不需要上传产物。

访问链路：`pibook.akikaze.top` → CNAME → `pibook.pages.dev`（橙色云代理）→ Pages 静态资源。区域 SSL 模式为「完全（严格）」，通用证书由 Cloudflare 自动续期。

本站点采用 docsify：不构建、不生成静态产物，仓库根目录即站点根目录。Pages 项目中的构建命令、构建输出目录、根目录三项均为空，因此每次推送都是把仓库内容原样发布。

- `index.html`：站点入口与 docsify 配置
- `_sidebar.md`：左侧导航
- `docsify/`：docsify 运行时与主题（已本地化，不依赖外部 CDN）
- 各 `.md` 文件：页面正文，与 GitHub 上浏览的是同一份文件

> 修改文档后无需重新构建：推送到 `main`，等约 1 分钟部署完成，浏览器刷新即可生效。只有更换主题或升级 docsify 时才需要改动 `docsify/` 目录。

## 一、本地预览

站点必须通过 HTTP 访问，直接双击 `index.html`（`file://` 协议）无法加载。在仓库根目录执行：

```bash
python -m http.server 8123
# 或
npx --yes serve -l 8123
```

然后浏览器打开 <http://127.0.0.1:8123/>。预览完成后按 `Ctrl+C` 结束。

## 二、上线

```bash
cd D:\aCode\pi-handbook
git push origin main
```

不需要 `rsync`、不需要登录服务器、也不需要手动上传。Pages 会拉取 `main` 的最新提交并发布，部署记录可在 Cloudflare 后台「Workers 和 Pages → pibook → 部署」查看。

**三点注意：**

- **分支推送等于公开。** 非 `main` 分支会生成预览部署（`<hash>.pibook.pages.dev`），预览访问默认为公开，尚未用 Cloudflare Access 限制。未完成的草稿不要推到公开仓库，或先在后台开启「限制预览」。
- **仓库是公开的，Pages 会原样发布仓库文件，包括 `.gitignore` 这类点文件。** 敏感文件必须靠 `.gitignore` 挡住，只要误提交并推送，就等于公开。密钥一律不入库，见仓库 README「三项前提」。
- **需要回滚时**，在「部署」列表里选中目标部署执行回滚，不要靠反向提交。

## 三、实际行为与限制

以下几条与直觉不同，排查问题时先看这里：

- 未匹配的路径一律返回 `200` 和 `index.html`，不会 404。输入错误的文件名会看到首页而不是错误页。
- `.md` 文件以 `text/markdown` 直接返回，由 docsify 在浏览器里渲染，因此源文件可被直接下载。
- `robots.txt` 由 Cloudflare 区域级的托管版本覆盖，仓库里放一份无效。要调整收录策略需在后台修改，仓库侧无对应开关。
- Pages 不发布 `.git/`，仓库历史不会外泄。反过来说，传统 nginx / Caddy 那套「禁止访问 `.git`」在这里没有对应机制，安全性来自「文件根本不存在」，而不是访问控制。
- `pibook.pages.dev` 可绕过自定义域名直接访问，任何针对域名的边缘规则都不会作用在这条路径上。

## 四、验证

```bash
curl -I https://pibook.akikaze.top/
curl -I https://pibook.akikaze.top/windows.md
```

预期均返回 `200`。浏览器打开域名后应看到：左侧导航、首页「秋风 pi 配置手册」、右上角搜索框与仓库链接。

## 五、常见问题

**页面一直显示「正在加载…」**：`docsify/docsify.min.js` 未推送完整，或部署尚未完成。检查浏览器控制台的 404 报错，并确认最新部署状态为成功。

**侧边栏不显示**：`_sidebar.md` 未推送，或 docsify 配置中 `loadSidebar` 未开启。

**点击导航跳转后空白**：对应的 `.md` 文件名大小写不匹配。Linux 文件系统区分大小写，导航中的名称必须与实际文件名完全一致。

**推送后页面没变化**：多为浏览器或 Cloudflare 缓存。Pages 对 HTML 与 Markdown 返回 `max-age=0, must-revalidate`，强制刷新通常即可；仍不生效时去后台确认是否触发了新部署。

**主题切换为深色**：将 `index.html` 中的 `docsify/vue.css` 改为 `docsify/dark.css`。
