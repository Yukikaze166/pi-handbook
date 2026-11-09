# Windows 10 / 11

> 适用系统：Windows 10 / 11（x64、arm64）
> 前置条件：Node.js ≥ 22、Git
> 预计耗时：约 20 分钟
> 对应配置：`config/settings.windows.json` + `config/pi-plan-mode.windows.json` + `config/agent/`

本页用于在 Windows 设备上安装 pi，并复刻秋风的模型、扩展、工作模式与子代理角色配置。

## 一、前置准备

**Node.js（≥ 22，必需）**

- 官方下载页：<https://nodejs.org/zh-cn/download>
- 或执行 `winget install OpenJS.NodeJS.LTS`

安装完成后重新打开终端并验证：

```powershell
node -v    # 需为 v22 或更高
npm -v
```

**Git（必需）**

- <https://git-scm.com/install/windows>
- 或执行 `winget install Git.Git`

采用默认选项安装即可。pi 的 `bash` 工具将使用 `C:\Program Files\Git\bin\bash.exe`。

```powershell
git --version
```

**可选组件**

- Visual Studio Code：<https://code.visualstudio.com/download>
- Windows Terminal：微软应用商店 Microsoft Store 搜索「Windows Terminal」

## 二、安装 fd 与 ripgrep

fd 与 ripgrep 是 pi 进行文件检索所依赖的两个外部工具，也是国内网络环境下最常见的受阻环节。

pi 按以下顺序查找：`~/.pi/agent/bin/fd.exe` → `PATH` 中的 `fd` → 从 GitHub 自动下载。因此以下三种方式任选其一。

**方式 A：winget（推荐）**

```powershell
winget install --id sharkdp.fd -e
winget install --id BurntSushi.ripgrep.MSVC -e
```

**方式 B：手动放置至 pi 目录**（网络不可用或下载缓慢时最可靠）

下载 fd 与 ripgrep 的 Windows 压缩包（GitHub 访问缓慢时可使用镜像前缀，例如 `https://ghfast.top/`），解压后仅保留以下两个文件：

```
%USERPROFILE%\.pi\agent\bin\fd.exe
%USERPROFILE%\.pi\agent\bin\rg.exe
```

该目录为 pi 的首选查找位置，放入后无需联网，也不依赖 `PATH`。

**方式 C：由 pi 自动下载**

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7890"   # 替换为实际代理端口
```

随后首次启动 pi，将自动下载并安装至 `~/.pi/agent/bin/`。

验证：

```powershell
fd --version
rg --version
```

## 三、安装 pi

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

国内网络建议指定镜像：

```powershell
npm install -g --ignore-scripts --registry=https://registry.npmmirror.com @earendil-works/pi-coding-agent
```

```powershell
pi --version
```

## 四、部署配置

```powershell
git clone https://github.com/Yukikaze166/pi-handbook
cd pi-handbook

New-Item -ItemType Directory -Force "$env:USERPROFILE\.pi\agent" | Out-Null
Copy-Item -Recurse -Force .\config\agent\* "$env:USERPROFILE\.pi\agent\"
Copy-Item -Force .\config\settings.windows.json "$env:USERPROFILE\.pi\agent\settings.json"
Copy-Item -Force .\config\pi-plan-mode.windows.json "$env:USERPROFILE\.pi\agent\pi-plan-mode.json"
```

部署完成后，目录结构应如下：

```
%USERPROFILE%\.pi\agent\
├─ settings.json          # 来源：settings.windows.json
├─ models.json
├─ subagents.json
├─ tasks-config.json
├─ pi-cc-extensions.json
├─ pi-plan-mode.json      # 来源：pi-plan-mode.windows.json
├─ AGENTS.md
├─ agents\                # 6 个角色定义
├─ extensions\            # timestamp.ts、work-mode.ts
├─ skills\                # officecli、browser-use
└─ vendor\pi-subagents\   # 含本地补丁的发行副本
```

## 五、补齐依赖

**vendor 包的运行时依赖**（跳过此步骤将导致 `/team`、`/flow` 报错）：

```powershell
cd "$env:USERPROFILE\.pi\agent\vendor\pi-subagents"
npm install --omit=dev --omit=peer
```

**6 个 npm 扩展无需手动安装。** `settings.json` 的 `packages` 字段已声明这些扩展，pi 在启动时自动获取。国内网络可先设置镜像：

```powershell
npm config set registry https://registry.npmmirror.com
```

若获取失败，pi 仅输出警告、不中断启动，并在下次启动时重试。

## 六、登录

```powershell
pi
```

进入交互界面后执行 `/login`：

- `deepseek`：填写 API Key，取值与主机环境一致
- `openai-codex`：采用 OAuth 授权，在浏览器中完成确认

`auth.json` 不包含在仓库内，因此每台设备均需登录一次。

## 七、验收

逐项确认，全部通过即视为复刻完成：

```powershell
pi --version          # 1.5.x
fd --version
rg --version
pi list               # 应列出 6 个 npm 扩展与 vendor\pi-subagents
```

在 pi 交互界面中确认：

- [ ] 启动过程无 `fd not found`、`ripgrep not found`、`package failed to install` 类警告
- [ ] 界面为 dark 主题与 fullscreen 模式，默认模型为 `deepseek-flash`，思考等级为 `high`
- [ ] `/agents` 可见 6 个角色：scout、researcher、browser-operator、office-operator、worker、reviewer
- [ ] `/solo`、`/team`、`/flow` 均可正常切换，新会话默认为 SOLO
- [ ] `/plan` 可进入只读规划模式，且规划期间编辑工具被禁用
- [ ] 已设 `DASHSCOPE_API_KEY` 时，`/model` 中可见 `qwen3.8-flash` 与 `deepseek-v4.1-flash-1017`
- [ ] skill 列表包含 `officecli` 与 `browser-use`
- [ ] 可正常发起对话并获得回复

## 常见问题

**`pi` 命令不可用。** npm 全局 bin 目录未加入 `PATH`。重新打开终端后仍不可用时，执行 `npm config get prefix`，将其输出路径加入用户 `PATH`。

**启动提示 fd 或 rg 下载失败。** 属预期现象，改用「二、方式 B」手动放置两个可执行文件即可。

**`/team` 报 work-mode 相关错误。** 多为 `vendor\pi-subagents` 未完整复制，或第五步的 `npm install` 未执行。

**`vendor\pi-subagents` 必须整份复制。** `extensions\work-mode.ts` 直接引用其中的 `src/child-context.js`，且该目录包含 4 处本地补丁（transcript 路径、PowerShell 工具、work-mode 策略桥等）。从 npm 重新安装上游包将导致补丁全部丢失。细节见 `config\agent\vendor\pi-subagents-LOCAL-PATCH.md`。

**browser-use skill 无法连接。** 该 skill 依赖本机 Chrome 的调试端口，需以 `--remote-debugging-port` 启动 Chrome，或使用 skill 中提供的连接脚本。

**officecli skill 不可用。** 需单独安装 officecli CLI，安装方式见该 skill 文件。

**阿里云百炼的两个模型不显示或调用失败。** 先确认环境变量 `DASHSCOPE_API_KEY` 已设置（新开终端后生效），再检查 `models.json` 是否完整复制。该变量未设置时只有这两个模型受影响，其余模型正常。
