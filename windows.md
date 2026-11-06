# Windows 10 / 11

目标：装好 pi，并复刻本机的模型、扩展、工作模式、子代理角色。

## 一、安装前置

**Node.js（≥ 22，必须）**

- 官网下载：<https://nodejs.org/zh-cn/download>
- 或 `winget install OpenJS.NodeJS.LTS`

装完开个新终端验证：

```powershell
node -v    # v22 以上
npm -v
```

**Git（必须）**

- <https://git-scm.com/install/windows>
- 或 `winget install Git.Git`

默认选项装完即可，pi 的 `bash` 工具会用 `C:\Program Files\Git\bin\bash.exe`。

```powershell
git --version
```

**可选**

- Visual Studio Code：<https://code.visualstudio.com/download>
- Windows Terminal：微软应用商店 Microsoft Store 搜「Windows Terminal」

## 二、装 fd 和 ripgrep

pi 的两个附属工具，卡国内网络时手动安装，下面任选一种：

**A. winget（推荐）**

```powershell
winget install --id sharkdp.fd -e
winget install --id BurntSushi.ripgrep.MSVC -e
```

**B. 手动放到 pi 自己的目录**（没网/下载慢时最稳）

下载 fd、ripgrep 的 Windows 压缩包（GitHub 慢就用镜像，例如 `https://ghfast.top/` 前缀），解压后只留两个文件：

```
%USERPROFILE%\.pi\agent\bin\fd.exe
%USERPROFILE%\.pi\agent\bin\rg.exe
```

这是 pi 的第一查找位，放进去就不联网、也不占 PATH。

**C. 开代理，让 pi 自己下**

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7890"   # 换成你的代理端口
```

然后第一次启动 pi，它会自己下好放到 `~/.pi/agent/bin/`。

验证：

```powershell
fd --version
rg --version
```

## 三、装 pi

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

国内慢就加镜像：

```powershell
npm install -g --ignore-scripts --registry=https://registry.npmmirror.com @earendil-works/pi-coding-agent
```

```powershell
pi --version
```

## 四、拷配置

```powershell
git clone https://github.com/<你的用户名>/pi-handbook
cd pi-handbook

New-Item -ItemType Directory -Force "$env:USERPROFILE\.pi\agent" | Out-Null
Copy-Item -Recurse -Force .\config\agent\* "$env:USERPROFILE\.pi\agent\"
Copy-Item -Force .\config\settings.windows.json "$env:USERPROFILE\.pi\agent\settings.json"
```

拷完应该长这样：

```
%USERPROFILE%\.pi\agent\
├─ settings.json          # 来自 settings.windows.json
├─ models.json
├─ subagents.json
├─ tasks-config.json
├─ pi-cc-extensions.json
├─ AGENTS.md
├─ agents\                # 6 个角色
├─ extensions\            # timestamp.ts, work-mode.ts
├─ skills\                # officecli, browser-use
└─ vendor\pi-subagents\   # 本地补丁版
```

## 五、补依赖

**vendor 包的运行时依赖**（跳了这步 `/team` `/flow` 会报错）：

```powershell
cd "$env:USERPROFILE\.pi\agent\vendor\pi-subagents"
npm install --omit=dev --omit=peer
```

**5 个 npm 扩展**不用手动装，`settings.json` 的 `packages` 列表里有，pi 启动时自己下。国内慢就先设镜像：

```powershell
npm config set registry https://registry.npmmirror.com
```

装不上的话 pi 只警告不崩，下次启动会重试。

## 六、登录

```powershell
pi
```

进入界面后输入 `/login`：

- `deepseek`：填 API Key（和你现在这台一样）
- `openai-codex`：走 OAuth，浏览器里授权

`auth.json` 没进仓库，所以每台机器都要登录一次。

## 七、验证

逐条过一遍，全对才算复刻完成：

```powershell
pi --version          # 1.5.x
fd --version
rg --version
pi list               # 5 个 npm 扩展 + vendor\pi-subagents 都在列表里
```

然后在 pi 里确认：

- [ ] 启动没有 `fd not found` / `ripgrep not found` / `package failed to install` 类警告
- [ ] 状态栏是 dark + fullscreen，默认模型 `deepseek-flash`、思考 `high`
- [ ] `/agents` 能看到 6 个角色（scout / researcher / browser-operator / office-operator / worker / reviewer）
- [ ] `/solo` `/team` `/flow` 能切，新会话默认 SOLO
- [ ] skill 列表里有 `officecli` 和 `browser-use`
- [ ] 随便问一句，能正常出回复（模型可用）

## 常见问题

**`pi` 命令找不到**：npm 全局 bin 目录没进 PATH。重开终端；还不行就跑 `npm config get prefix`，把它的输出加进用户 PATH。

**启动提示 fd/rg 下载失败**：正常，直接走上面「二、B」手动放两个 exe。

**`/team` 报 work-mode 相关错误**：多半是 `vendor\pi-subagents` 没拷全，或第五步的 `npm install` 没做。

**`vendor\pi-subagents` 必须整个拷**：`extensions\work-mode.ts` 直接 `import` 了里面的 `src/child-context.js`，而且里面有 4 处本地补丁（transcript 路径、PowerShell 工具、work-mode 策略桥等），从 npm 重装上游包会全丢。细节见 `config\agent\vendor\pi-subagents-LOCAL-PATCH.md`。

**browser-use skill 连不上**：它依赖本机 Chrome 的调试端口，先确保 Chrome 用 `--remote-debugging-port` 起过，或用 skill 里写的连接脚本。

**officecli skill 用不了**：需要单独装 officecli CLI，skill 文件里写了安装方式。
