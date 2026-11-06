# Linux 服务器（Ubuntu / Debian）

目标：装好 pi，并复刻本机的模型、扩展、工作模式、子代理角色。和 Windows 版的差别只有三处：包管理器、`settings.json` 用 unix 版、不装 `browser-use`。

## 一、安装前置

**Node.js（≥ 22，必须）**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
```

用 nvm 的话记得走镜像再装：

```bash
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
```

验证：

```bash
node -v    # v22 以上
npm -v
git --version
```

## 二、装 fd 和 ripgrep

```bash
sudo apt update
sudo apt install -y fd-find ripgrep
```

**注意**：Debian/Ubuntu 里 `fd-find` 包的命令叫 **`fdfind`**，不是 `fd`。pi 认这个别名，不用自己做软链。

```bash
fdfind --version
rg --version
```

服务器没有 sudo、或发行版仓库太旧没有 fd 时，直接把二进制丢进 pi 自己的目录（优先级最高，不需要 PATH）：

```bash
mkdir -p ~/.pi/agent/bin
# 下载 x86_64-unknown-linux-musl 的 fd / rg 压缩包（GitHub 慢就用 ghfast.top 之类的镜像）
tar -xzf fd-*.tar.gz && cp fd-*/fd ~/.pi/agent/bin/ && chmod +x ~/.pi/agent/bin/fd
tar -xzf ripgrep-*.tar.gz && cp ripgrep-*/rg ~/.pi/agent/bin/ && chmod +x ~/.pi/agent/bin/rg
```

## 三、装 pi

```bash
sudo npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

国内慢加镜像：

```bash
sudo npm install -g --ignore-scripts --registry=https://registry.npmmirror.com @earendil-works/pi-coding-agent
```

```bash
pi --version
```

（用 nvm 装的 Node 不需要 sudo，直接 `npm install -g`。）

## 四、拷配置

```bash
git clone https://github.com/<你的用户名>/pi-handbook ~/pi-handbook

mkdir -p ~/.pi/agent
cp -r ~/pi-handbook/config/agent/. ~/.pi/agent/
cp ~/pi-handbook/config/settings.unix.json ~/.pi/agent/settings.json
```

**一定要用 `settings.unix.json`**。`settings.windows.json` 里有 `shellPath`（指向 `C:\Program Files\Git\bin\bash.exe`）和 `defaultTools` 里的 `powershell` 工具，在 Linux 上会让 bash 工具直接报错。

## 五、补依赖

```bash
cd ~/.pi/agent/vendor/pi-subagents
npm install --omit=dev --omit=peer
```

跳了这步 `/team` `/flow` 会报错——`vendor/pi-subagents` 是带本地补丁的版本，必须连同它的两个运行时依赖（`croner`、`nanoid`）一起装好。

5 个 npm 扩展不用管，`settings.json` 的 `packages` 里有，pi 启动自己下。慢就先设镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

**去掉 Windows 专用的 skill**：

```bash
rm -rf ~/.pi/agent/skills/browser-use
```

`browser-use` 依赖本机 Chrome 的调试端口，服务器上没有，留着只会让模型误判能力。`officecli` 保留。

## 六、登录

```bash
pi
```

输入 `/login`：

- `deepseek`：填 API Key
- `openai-codex`：OAuth 走浏览器。服务器没有图形界面时，pi 会给一个链接，拷到你本地浏览器打开授权，再把回跳的地址/授权码贴回来。

## 七、验证

```bash
pi --version          # 1.5.x
fdfind --version
rg --version
pi list               # 5 个 npm 扩展 + vendor/pi-subagents
```

然后在 pi 里确认：

- [ ] 启动没有 `fd not found` / `ripgrep not found` / `package failed to install` 类警告
- [ ] 默认模型 `deepseek-flash`、思考等级 `high`、dark + fullscreen
- [ ] bash 工具能正常执行（`ls` / `git status` 之类）
- [ ] `/agents` 有 6 个角色，`/solo` `/team` `/flow` 能切
- [ ] skill 列表里只有 `officecli`，没有 `browser-use`
- [ ] 能正常出回复

## 常见问题

**`fd: command not found`**：装的是 `fd-find` 包，命令名是 `fdfind`，pi 自己会认；手动敲的话用 `fdfind`。

**`pi: command not found`**：npm 全局 bin 没进 PATH。`npm config get prefix` 看路径，把 `bin` 子目录加进 `~/.bashrc` 的 `PATH`，或改用 nvm 装 Node。

**npm 报 EACCES**：别用 `sudo npm` 硬顶，装 nvm 用用户级 Node 更省事。

**启动报 `shellPath` 或 bash 路径不存在**：拷成 `settings.windows.json` 了，换成 `settings.unix.json`。

**`/team` 报 work-mode 相关错误**：`vendor/pi-subagents` 没拷全，或第五步没做。这个目录必须整份搬，里面有 4 处本地补丁，从 npm 重装上游包会全丢（详见 `config/agent/vendor/pi-subagents-LOCAL-PATCH.md`）。

**想让 pi 常驻**：用 `tmux new -s pi` 或 `screen` 跑，别用 nohup 直接怼，TUI 需要真终端。
