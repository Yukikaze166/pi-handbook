# pi 配置复刻手册

把我这台 Windows 上配好的 pi，原样搬到其他设备上：手机、别的 Windows 电脑、Linux 服务器。

复刻的不是「装个 pi 能用」，而是**同一套工作环境**：

| 项目 | 内容 |
|---|---|
| 模型 | 默认 `deepseek-flash`，思考等级 `high`，自定义 `models.json` |
| 界面 | dark 主题、fullscreen TUI、隐藏思考块 |
| 扩展 | 5 个 npm 扩展 + 本地补丁版 `pi-subagents` + `timestamp` / `work-mode` 两个自写扩展 |
| 工作模式 | `/solo` `/team` `/flow` `/workmode`（默认 SOLO） |
| 子代理 | 6 个角色：scout / researcher / browser-operator / office-operator / worker / reviewer |
| Skills | `officecli`（全平台）、`browser-use`（仅 Windows） |
| 规范 | 全局 `AGENTS.md` 工作规范 |

不迁移的东西：对话历史（`sessions/`）、登录凭据（`auth.json`）、项目信任列表（`trust.json`）、`fd`/`rg` 二进制。

## 我要装在哪

| 设备 | 文档 | 前置 | 大概耗时 |
|---|---|---|---|
| Windows 10 / 11 | [windows.md](windows.md) | Node ≥ 22、Git | 20 分钟 |
| Linux 服务器（Ubuntu / Debian） | [linux.md](linux.md) | Node ≥ 22、sudo | 15 分钟 |
| 安卓手机（Termux） | [android.md](android.md) | Termux（从 F-Droid 装） | 20 分钟 |

三份文档结构一样：**前置 → 装 pi → 拷配置 → 补依赖 → 登录 → 验证**。卡住了直接看对应页的「常见问题」。

## 仓库结构

```
pi-handbook/
├─ README.md                 # 本页
├─ windows.md / linux.md / android.md
└─ config/
   ├─ settings.windows.json  # Windows 用（含 shellPath、powershell 工具）
   ├─ settings.unix.json     # Linux / Termux 用（去掉上面两项，路径改正斜杠）
   └─ agent/                 # 原样铺到 ~/.pi/agent/
      ├─ models.json
      ├─ subagents.json
      ├─ tasks-config.json
      ├─ pi-cc-extensions.json
      ├─ AGENTS.md
      ├─ agents/             # 6 个角色定义
      ├─ extensions/         # timestamp.ts、work-mode.ts
      ├─ skills/             # officecli、browser-use
      └─ vendor/pi-subagents # 带本地补丁的发行副本（不含 node_modules）
```

`config/agent/` 的目录结构和 `~/.pi/agent/` 一一对应，所以拷配置就是一次目录拷贝。

## 两个必须知道的前提

**1. 密钥不入库。** `auth.json` 不在仓库里，每台设备装完自己登录一次（跑 `pi` 后输入 `/login`，选 deepseek 填 API Key；openai-codex 走 OAuth 浏览器登录）。

**2. `settings.json` 分两份。** Windows 那份里有 `shellPath`（指向 Git Bash）和 `defaultTools` 里的 `powershell` 工具，Linux / Termux 上没有。所以平台页各自指向对应文件，别拷错。

## 本机配置改了怎么同步回仓库

在 Windows 上改完配置后，把变动重新拷回 `config/`：

```powershell
cd D:\aCode\pi-handbook
Copy-Item -Recurse -Force "$env:USERPROFILE\.pi\agent\agents","$env:USERPROFILE\.pi\agent\extensions","$env:USERPROFILE\.pi\agent\skills" .\config\agent\ -Force
Copy-Item -Force "$env:USERPROFILE\.pi\agent\models.json","$env:USERPROFILE\.pi\agent\subagents.json","$env:USERPROFILE\.pi\agent\tasks-config.json","$env:USERPROFILE\.pi\agent\pi-cc-extensions.json","$env:USERPROFILE\.pi\agent\AGENTS.md" .\config\agent\
Copy-Item -Force "$env:USERPROFILE\.pi\agent\settings.json" .\config\settings.windows.json
```

（改过 `vendor\pi-subagents` 的话，别忘了再同步一次，并把差异补进 `config/agent/vendor/pi-subagents-LOCAL-PATCH.md`；`settings.unix.json` 需要手工跟着改。）
