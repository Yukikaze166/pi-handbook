# Linux 服务器（Ubuntu / Debian）

> 适用系统：Ubuntu 20.04+ / Debian 11+（x64、arm64）
> 前置条件：Node.js ≥ 22、sudo 权限、Git
> 预计耗时：约 15 分钟
> 对应配置：`config/settings.unix.json` + `config/pi-plan-mode.unix.json` + `config/agent/`

本页用于在 Linux 服务器上安装 pi，并复刻秋风的模型、扩展、工作模式与子代理角色配置。与 Windows 版的差异有三处：包管理器不同、使用 unix 版 `settings.json`、不部署 `browser-use`。

## 一、前置准备

**Node.js（≥ 22，必需）**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
```

使用 nvm 时，建议先设置镜像源再安装：

```bash
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
```

验证：

```bash
node -v    # 需为 v22 或更高
npm -v
git --version
```

## 二、安装 fd 与 ripgrep

```bash
sudo apt update
sudo apt install -y fd-find ripgrep
```

**注意**：Debian / Ubuntu 中 `fd-find` 包提供的命令名为 **`fdfind`**，而非 `fd`。pi 已兼容该别名，无需自行创建软链接。

```bash
fdfind --version
rg --version
```

若服务器无 sudo 权限，或发行版仓库版本过旧而不提供 fd，可将二进制直接放置至 pi 目录。该目录优先级最高，且不依赖 `PATH`：

```bash
mkdir -p ~/.pi/agent/bin
# 下载 x86_64-unknown-linux-musl 架构的 fd / rg 压缩包（GitHub 访问缓慢时可使用 ghfast.top 等镜像）
tar -xzf fd-*.tar.gz && cp fd-*/fd ~/.pi/agent/bin/ && chmod +x ~/.pi/agent/bin/fd
tar -xzf ripgrep-*.tar.gz && cp ripgrep-*/rg ~/.pi/agent/bin/ && chmod +x ~/.pi/agent/bin/rg
```

## 三、安装 pi

```bash
sudo npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

国内网络建议指定镜像：

```bash
sudo npm install -g --ignore-scripts --registry=https://registry.npmmirror.com @earendil-works/pi-coding-agent
```

```bash
pi --version
```

使用 nvm 安装的 Node.js 无需 sudo，直接执行 `npm install -g` 即可。

## 四、部署配置

```bash
git clone https://github.com/Yukikaze166/pi-handbook ~/pi-handbook

mkdir -p ~/.pi/agent
cp -r ~/pi-handbook/config/agent/. ~/.pi/agent/
cp ~/pi-handbook/config/settings.unix.json ~/.pi/agent/settings.json
cp ~/pi-handbook/config/pi-plan-mode.unix.json ~/.pi/agent/pi-plan-mode.json
```

**必须使用 `settings.unix.json`。** `settings.windows.json` 包含 `shellPath`（指向 `C:\Program Files\Git\bin\bash.exe`）与 `defaultTools` 中的 `powershell` 工具，在 Linux 环境下会直接导致 `bash` 工具报错。

## 五、补齐依赖

```bash
cd ~/.pi/agent/vendor/pi-subagents
npm install --omit=dev --omit=peer
```

跳过此步骤将导致 `/team`、`/flow` 报错。`vendor/pi-subagents` 为含本地补丁的版本，需连同其两个运行时依赖（`croner`、`nanoid`）一并安装。

6 个 npm 扩展无需手动安装，`settings.json` 的 `packages` 字段已声明，pi 在启动时自动获取。国内网络可先设置镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

**移除 Windows 专用 skill：**

```bash
rm -rf ~/.pi/agent/skills/browser-use
```

`browser-use` 依赖本机 Chrome 的调试端口，服务器环境不具备该条件。保留会导致模型误判自身能力，因此移除。`officecli` 保留。

## 六、登录与环境变量

```bash
pi
```

执行 `/login`：

- `deepseek`：填写 API Key
- `openai-codex`：采用 OAuth 授权。服务器无图形界面时，pi 会输出授权链接，需在本地浏览器打开并完成授权，再将回跳地址或授权码回填。

**环境变量（两个 API Key）**

```bash
cat >> ~/.bashrc <<'EOF'
export DASHSCOPE_API_KEY="sk-..."
export TAVILY_API_KEY="tvly-..."
EOF
source ~/.bashrc
```

仅当前会话生效时直接 `export` 即可。这两个值不要写入仓库或任何脚本文件。

用途：`DASHSCOPE_API_KEY` 供阿里云百炼两个模型使用，`TAVILY_API_KEY` 供 `web_search` / `web_fetch` 使用。设置后需重启 pi。

## 七、验收

```bash
pi --version          # 1.5.x
fdfind --version
rg --version
pi list               # 应列出 6 个 npm 扩展与 vendor/pi-subagents
```

在 pi 交互界面中确认：

- [ ] 启动过程无 `fd not found`、`ripgrep not found`、`package failed to install` 类警告
- [ ] 默认模型为 `deepseek-flash`，思考等级为 `high`，界面为 dark 主题与 fullscreen 模式
- [ ] `bash` 工具可正常执行（如 `ls`、`git status`）
- [ ] `/agents` 可见 6 个角色，`/solo`、`/team`、`/flow` 均可切换
- [ ] `/plan` 可进入只读规划模式，且规划期间编辑工具被禁用
- [ ] 已设 `DASHSCOPE_API_KEY` 时，`/model` 中可见两个阿里云百炼模型
- [ ] `web_search` 可正常返回结果（需 `TAVILY_API_KEY`）
- [ ] skill 列表仅含 `officecli`，不含 `browser-use`
- [ ] 可正常发起对话并获得回复

## 常见问题

**`fd: command not found`。** 安装的是 `fd-find` 包，其命令名为 `fdfind`，pi 已兼容该别名；需要手动调用时使用 `fdfind`。

**`pi: command not found`。** npm 全局 bin 目录未加入 `PATH`。执行 `npm config get prefix` 查看路径，将其下的 `bin` 子目录追加至 `~/.bashrc` 的 `PATH`，或改用 nvm 安装 Node.js。

**npm 报 EACCES 权限错误。** 不建议强行使用 `sudo npm`，改用 nvm 安装用户级 Node.js 更为稳妥。

**启动报 `shellPath` 或 bash 路径不存在。** 误用了 `settings.windows.json`，替换为 `settings.unix.json`。

**`/team` 报 work-mode 相关错误。** `vendor/pi-subagents` 未完整复制，或第五步未执行。该目录需整份迁移，其中包含 4 处本地补丁，从 npm 重新安装上游包将导致补丁全部丢失（详见 `config/agent/vendor/pi-subagents-LOCAL-PATCH.md`）。

**需要 pi 常驻运行。** 建议使用 `tmux new -s pi` 或 `screen` 启动，不宜直接使用 `nohup`，因 TUI 需要真实终端。

**阿里云百炼的两个模型不显示或调用失败。** 先确认 `DASHSCOPE_API_KEY` 已设置（写入 `~/.bashrc` 后需重新登录或 `source`），再检查 `models.json` 是否完整复制。未设置该变量时只有这两个模型受影响。

**`web_search` 报 `Missing TAVILY_API_KEY`。** 环境变量 `TAVILY_API_KEY` 未设置或未生效。按第六步写入 `~/.bashrc` 并 `source`，重启 pi 后用 `echo $TAVILY_API_KEY` 确认非空。
