# 安卓手机（Termux）

目标：在手机上跑同一套 pi 配置。和 Linux 版的差别：`pkg` 代替 `apt`、Termux 的路径、`browser-use` 装不了（手机没有 Chrome 调试端口）。

## 一、装 Termux

从 **F-Droid** 装：<https://f-droid.org/packages/com.termux/>。别用 Play 商店版本，那个已经废弃，包管理会出问题。

装完打开，先更新并装前置：

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs git ripgrep fd
node -v    # 需要 v22 以上
```

`fd` 在 Termux 仓库里就叫 `fd`，装完直接是 `fd` 命令。

## 二、装 pi

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi --version
```

Termux 的 npm 全局目录在用户空间内，**不需要 sudo**。国内慢就加镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

**注意**：pi 在 Android 上**不会**自动下载 fd/rg（Bionic libc 不兼容官方 Linux 二进制），必须靠上面 `pkg install` 装好。如果启动时提示 `fd not found`，就是这一步漏了。

## 三、拷配置

```bash
git clone https://github.com/<你的用户名>/pi-handbook ~/pi-handbook

mkdir -p ~/.pi/agent
cp -r ~/pi-handbook/config/agent/. ~/.pi/agent/
cp ~/pi-handbook/config/settings.unix.json ~/.pi/agent/settings.json
```

用 `settings.unix.json`，别用 Windows 那份（里面 `shellPath` 和 `powershell` 工具在 Termux 上都不存在）。

## 四、补依赖

```bash
cd ~/.pi/agent/vendor/pi-subagents
npm install --omit=dev --omit=peer
```

**去掉装不了的 skill**：

```bash
rm -rf ~/.pi/agent/skills/browser-use
```

`browser-use` 需要连本机 Chrome 的调试端口，手机上没法用，留着会让模型误判。`officecli` 保留（它只需要 Node）。

## 五、登录

```bash
pi
```

输入 `/login`，选 `deepseek` 填 API Key，或者 `openai-codex` 走 OAuth（会跳浏览器，手机上直接就能授权）。

## 六、验证

```bash
pi --version
fd --version
rg --version
pi list
```

在 pi 里确认：

- [ ] 启动没有 `fd not found` / `ripgrep not found` / `package failed to install` 警告
- [ ] 默认模型 `deepseek-flash`、思考 `high`、dark + fullscreen
- [ ] bash 工具能跑（`ls` / `pwd` 正常）
- [ ] `/agents` 有 6 个角色，`/solo` `/team` `/flow` 能切
- [ ] skill 只剩 `officecli`
- [ ] 能正常出回复

## 常见问题

**Node 版本不够**：`pkg install nodejs`（别装 `nodejs-lts`，老版本可能低于 22），装完 `node -v` 确认。

**`fd: command not found`**：漏了 `pkg install fd`，或没有重开终端。

**输入 Ctrl / Esc 不方便**：Termux 的虚拟键盘 Ctrl 在左侧滑出栏里，`Ctrl+C` 中断、`Esc` 取消当前操作都靠它；也可以外接蓝牙键盘。

**切后台就被杀**：跑长任务前先

```bash
termux-wake-lock
```

结束再 `termux-wake-unlock`。还要在系统设置里把 Termux 的电池优化关掉，否则锁屏后进程会被冻结。

**想访问手机里的文件**：

```bash
termux-setup-storage
```

之后 `~/storage/shared` 就是内部存储。只有需要让 pi 读写手机文件时才开。

**`/team` 报 work-mode 错误**：`vendor/pi-subagents` 没拷全，或第四步 `npm install` 没做。

**内存吃紧**：`settings.json` 里已经开了 compaction（`reserveTokens` / `keepRecentTokens` 各 32768），小内存机器可以再调低这两个值。
