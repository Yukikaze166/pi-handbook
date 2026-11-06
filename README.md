# 秋风 pi 配置手册

本仓库用于在多台设备上复刻同一套 pi 工作环境，覆盖 Windows 计算机、Linux 服务器与安卓手机。

复刻目标并非「安装一个可用的 pi」，而是保持一致的工作环境：

| 项目 | 内容 |
|---|---|
| 模型 | 默认 `deepseek-flash`，思考等级 `high`，含自定义 `models.json` |
| 界面 | dark 主题、fullscreen TUI、隐藏思考块 |
| 扩展 | 5 个 npm 扩展 + 本地补丁版 `pi-subagents` + `timestamp` / `work-mode` 两个自写扩展 |
| 工作模式 | `/solo` `/team` `/flow` `/workmode`，新会话默认 SOLO |
| 子代理 | 6 个角色：scout / researcher / browser-operator / office-operator / worker / reviewer |
| Skills | `officecli`（全平台）、`browser-use`（仅 Windows） |
| 规范 | 全局 `AGENTS.md` 工作规范 |

以下内容不参与迁移：会话记录（`sessions/`）、登录凭据（`auth.json`）、项目信任列表（`trust.json`）、`fd` 与 `rg` 可执行文件。

## 目标设备

| 设备 | 文档 | 前置条件 | 预计耗时 |
|---|---|---|---|
| Windows 10 / 11 | [windows.md](windows.md) | Node.js ≥ 22、Git | 约 20 分钟 |
| Linux 服务器（Ubuntu / Debian） | [linux.md](linux.md) | Node.js ≥ 22、sudo 权限 | 约 15 分钟 |
| 安卓手机（Termux） | [android.md](android.md) | Termux（F-Droid 发行版） | 约 20 分钟 |

三份文档采用统一结构：**前置准备 → 安装 fd 与 ripgrep → 安装 pi → 部署配置 → 补齐依赖 → 登录 → 验收**。出现异常时，参见各页「常见问题」章节。

## 仓库结构

```
pi-handbook/
├─ README.md                 # 本页
├─ windows.md / linux.md / android.md
└─ config/
   ├─ settings.windows.json  # Windows 使用，含 shellPath 与 powershell 工具
   ├─ settings.unix.json     # Linux / Termux 使用，已移除上述两项并将路径改为正斜杠
   └─ agent/                 # 目录结构对应 ~/.pi/agent/
      ├─ models.json
      ├─ subagents.json
      ├─ tasks-config.json
      ├─ pi-cc-extensions.json
      ├─ AGENTS.md
      ├─ agents/             # 6 个角色定义
      ├─ extensions/         # timestamp.ts、work-mode.ts
      ├─ skills/             # officecli、browser-use
      └─ vendor/pi-subagents # 含本地补丁的发行副本，不含 node_modules
```

`config/agent/` 与 `~/.pi/agent/` 的目录结构一一对应，因此部署配置等同于一次目录复制。

## 两项前提

**一、凭据不入库。** `auth.json` 不包含在仓库内。每台设备安装完成后需自行登录一次：启动 `pi` 后执行 `/login`，选择 `deepseek` 并填写 API Key，或选择 `openai-codex` 完成 OAuth 授权。

**二、`settings.json` 分为两份。** Windows 版本包含 `shellPath`（指向 Git Bash）与 `defaultTools` 中的 `powershell` 工具，Linux 与 Termux 环境不具备上述条件。各平台文档已指明对应文件，请勿混用。

## 配置变更后的同步流程

在 Windows 主机上修改配置后，将变更同步回 `config/` 目录：

```powershell
cd D:\aCode\pi-handbook
Copy-Item -Recurse -Force "$env:USERPROFILE\.pi\agent\agents","$env:USERPROFILE\.pi\agent\extensions","$env:USERPROFILE\.pi\agent\skills" .\config\agent\ -Force
Copy-Item -Force "$env:USERPROFILE\.pi\agent\models.json","$env:USERPROFILE\.pi\agent\subagents.json","$env:USERPROFILE\.pi\agent\tasks-config.json","$env:USERPROFILE\.pi\agent\pi-cc-extensions.json","$env:USERPROFILE\.pi\agent\AGENTS.md" .\config\agent\
Copy-Item -Force "$env:USERPROFILE\.pi\agent\settings.json" .\config\settings.windows.json
```

若变更涉及 `vendor/pi-subagents`，需一并同步，并将差异补充至 `config/agent/vendor/pi-subagents-LOCAL-PATCH.md`；`settings.unix.json` 需人工同步修改。
