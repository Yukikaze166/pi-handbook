# 安卓手机（Termux）

> 适用系统：Android 7.0+，Termux（F-Droid 发行版）
> 前置条件：Termux 已安装、Node.js ≥ 22、Git
> 预计耗时：约 20 分钟
> 对应配置：`config/settings.unix.json` + `config/pi-plan-mode.unix.json` + `config/agent/`（不含 `browser-use` 与 `officecli`）

本页用于在安卓设备上运行同一套 pi 配置。与 Linux 版的差异为：以 `pkg` 代替 `apt`、Termux 专用路径，以及两个 skill 无法部署（`browser-use` 依赖 Chrome 调试端口，`officecli` 无 Android 版本）。

## 一、安装 Termux

从 **F-Droid** 安装：<https://f-droid.org/packages/com.termux/>。请勿使用 Play 商店版本，该版本已停止维护，包管理器可能出现异常。

安装完成后打开终端，更新并安装前置组件：

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs git ripgrep fd
node -v    # 需为 v22 或更高
```

`fd` 在 Termux 仓库中的包名即为 `fd`，安装后命令名同为 `fd`。

## 二、安装 pi

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi --version
```

Termux 的 npm 全局目录位于用户空间内，**无需 sudo**。国内网络建议设置镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

**注意**：pi 在 Android 上**不会**自动下载 fd 与 rg（官方 Linux 二进制基于 glibc，与 Android 的 Bionic 不兼容），必须通过上述 `pkg install` 安装。若启动时提示 `fd not found`，即为该步骤遗漏。

## 三、部署配置

```bash
git clone https://github.com/Yukikaze166/pi-handbook ~/pi-handbook

mkdir -p ~/.pi/agent
cp -r ~/pi-handbook/config/agent/. ~/.pi/agent/
cp ~/pi-handbook/config/settings.unix.json ~/.pi/agent/settings.json
cp ~/pi-handbook/config/pi-plan-mode.unix.json ~/.pi/agent/pi-plan-mode.json
```

必须使用 `settings.unix.json`。`settings.windows.json` 中的 `shellPath` 与 `powershell` 工具在 Termux 环境下均不存在。

## 四、补齐依赖

```bash
cd ~/.pi/agent/vendor/pi-subagents
npm install --omit=dev --omit=peer
```

**移除本平台不可用的两个 skill：**

```bash
rm -rf ~/.pi/agent/skills/browser-use ~/.pi/agent/skills/officecli
```

两者在 Termux 下均无法工作，保留会导致模型误判自身能力：

| Skill | 不可用原因 |
|---|---|
| `browser-use` | 依赖本机 Chrome 的调试端口，移动设备不具备 |
| `officecli` | 需官方分发的单文件二进制，仅提供 macOS、Linux（glibc）与 Windows 版本，无 Android / Termux 构建 |

## 五、登录与环境变量

```bash
pi
```

执行 `/login`：选择 `deepseek` 并填写 API Key，或选择 `openai-codex` 完成 OAuth 授权（移动设备可直接在浏览器中确认）。

**环境变量（两个 API Key）**

```bash
cat >> ~/.bashrc <<'EOF'
export DASHSCOPE_API_KEY="sk-..."
export TAVILY_API_KEY="tvly-..."
EOF
source ~/.bashrc
```

用途：`DASHSCOPE_API_KEY` 供阿里云百炼两个模型使用，`TAVILY_API_KEY` 供 `web_search` / `web_fetch` 使用。设置后需重启 pi。

## 六、验收

```bash
pi --version
fd --version
rg --version
pi list
```

在 pi 交互界面中确认：

- [ ] 启动过程无 `fd not found`、`ripgrep not found`、`package failed to install` 类警告
- [ ] 默认模型为 `deepseek-flash`，思考等级为 `high`，界面为 dark 主题与 fullscreen 模式
- [ ] `bash` 工具可正常执行（如 `ls`、`pwd`）
- [ ] `/agents` 可见 6 个角色，`/solo`、`/team`、`/flow` 均可切换
- [ ] `/plan` 可进入只读规划模式，且规划期间编辑工具被禁用
- [ ] `web_search` 可正常返回结果（需 `TAVILY_API_KEY`）
- [ ] skill 列表为空（`browser-use` 与 `officecli` 均已移除）
- [ ] 可正常发起对话并获得回复

## 常见问题

**Node.js 版本过低。** 执行 `pkg install nodejs`（不建议使用 `nodejs-lts`，其版本可能低于 22），安装后通过 `node -v` 确认。

**`fd: command not found`。** 遗漏 `pkg install fd`，或未重新打开终端。

**虚拟键盘操作不便。** Termux 虚拟键盘中，`Ctrl` 与 `Esc` 位于左侧滑出栏，`Ctrl+C` 用于中断、`Esc` 用于取消当前操作；亦可外接蓝牙键盘。

**后台进程被系统终止。** 运行长任务前执行：

```bash
termux-wake-lock
```

任务结束后执行 `termux-wake-unlock`。此外需在系统设置中关闭 Termux 的电池优化，否则锁屏后进程会被冻结。

**需要访问设备存储。** 执行：

```bash
termux-setup-storage
```

此后 `~/storage/shared` 指向内部存储。仅在需要让 pi 读写手机文件时启用。

**`/team` 报 work-mode 相关错误。** `vendor/pi-subagents` 未完整复制，或第四步的 `npm install` 未执行。

**officecli skill 不可用。** Termux 不适用：officecli 为官方分发的单文件二进制，仅提供 macOS、Linux（glibc）与 Windows 版本，无法在 Android 的 Bionic 环境运行。该 skill 已在第四步移除；如需处理 Office 文档，请改用其他设备。

**阿里云百炼的两个模型不显示或调用失败。** 先确认 `DASHSCOPE_API_KEY` 已设置（`export` 后需重新启动 pi），再检查 `models.json` 是否完整复制。未设置该变量时只有这两个模型受影响。

**`web_search` 报 `Missing TAVILY_API_KEY`。** 环境变量 `TAVILY_API_KEY` 未设置或未生效。按第五步写入 `~/.bashrc` 并 `source`，重启 pi 后用 `echo $TAVILY_API_KEY` 确认非空。

**内存受限。** `settings.json` 已启用上下文压缩（`reserveTokens` 与 `keepRecentTokens` 各 32768）。内存较小的设备可适当调低这两个值。
