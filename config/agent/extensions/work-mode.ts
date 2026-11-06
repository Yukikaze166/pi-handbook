import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { inChildSessionContext } from "../vendor/pi-subagents/src/child-context.js";

// Local integration for pi-subagents 0.23.1 + pi-tasks 0.9.1; see vendor patch notes.
const POLICY = Symbol.for("pi-local:work-mode-policy:v1");
const MANAGER = Symbol.for("pi-subagents:manager");
const ENTRY = "pi-local-work-mode-v1";
const TOOLS_ENTRY = "pi-local-work-mode-hidden-tools-v1";
type Mode = "solo" | "team" | "flow";
const ranks: Record<Mode, number> = { solo: 0, team: 1, flow: 2 };
const teamTools = new Set(["Agent", "TaskCreate", "TaskUpdate", "TaskList", "TaskGet", "TaskExecute", "steer_subagent"]);
const flowTools = new Set(["SubagentWorkflow"]);
const launchTools = new Set(["Agent", "TaskExecute", "SubagentWorkflow"]);
const managed = new Set([...teamTools, ...flowTools]);
const isMode = (v: unknown): v is Mode => v === "solo" || v === "team" || v === "flow";
const denied = (mode: Mode, name: string) => (mode === "solo" && teamTools.has(name)) || (mode !== "flow" && flowTools.has(name));

export default function workMode(pi: ExtensionAPI) {
  // Child sessions inherit user rules and role instructions, not the parent's mode controller.
  if (inChildSessionContext()) return;
  let mode: Mode = "solo";
  let owner: string | undefined;
  const hiddenByUs = new Set<string>();
  const inFlight = new Set<string>();

  function restore(ctx: ExtensionContext) {
    const id = ctx.sessionManager.getSessionId();
    if (owner === id) return;
    owner = id;
    mode = "solo";
    hiddenByUs.clear();
    // This is a session-wide user preference, deliberately not an execution-branch state.
    // New/forked sessions have new ids and cannot inherit another session's permission.
    for (const e of ctx.sessionManager.getEntries()) {
      if (e.type === "custom" && e.customType === ENTRY) {
        const d = e.data as { sessionId?: string; mode?: unknown } | undefined;
        if (d?.sessionId === id && isMode(d.mode)) mode = d.mode;
      }
      if (e.type === "custom" && e.customType === TOOLS_ENTRY) {
        const d = e.data as { sessionId?: string; tools?: unknown } | undefined;
        if (d?.sessionId === id && Array.isArray(d.tools)) {
          hiddenByUs.clear();
          for (const name of d.tools) if (typeof name === "string" && managed.has(name)) hiddenByUs.add(name);
        }
      }
    }
  }

  const policy = {
    assertAllowed(action: "agent" | "workflow", ctx?: ExtensionContext) {
      if (ctx) restore(ctx); // Also handles startup-flag work before our session_start handler.
      if (mode === "solo" || (action === "workflow" && mode !== "flow")) {
        throw new Error(`Work mode ${mode.toUpperCase()} blocks ${action} execution. User must switch to /${action === "workflow" ? "flow" : "team"}.`);
      }
    },
  };
  (globalThis as any)[POLICY] = policy;

  function apply(ctx: ExtensionContext) {
    restore(ctx);
    const previousHidden = JSON.stringify([...hiddenByUs].sort());
    const active = new Set(pi.getActiveTools());
    const known = new Set(pi.getAllTools().map(t => t.name));
    for (const name of managed) {
      if (denied(mode, name)) {
        if (active.delete(name)) hiddenByUs.add(name);
      } else if (hiddenByUs.has(name) && known.has(name)) {
        active.add(name);
        hiddenByUs.delete(name);
      }
    }
    const before = pi.getActiveTools();
    if (before.length !== active.size || before.some(n => !active.has(n))) pi.setActiveTools([...active]);
    // Pi resumes the tool removals recorded in system messages. Persist ownership
    // too, or an empty fresh in-memory set could never restore those tools.
    if (previousHidden !== JSON.stringify([...hiddenByUs].sort())) {
      pi.appendEntry(TOOLS_ENTRY, { sessionId: owner, tools: [...hiddenByUs].sort() });
    }
    if (ctx.hasUI) ctx.ui.setStatus("work-mode", `MODE ${mode.toUpperCase()}`);
  }

  function activity(): { known: boolean; items: string[] } {
    const bridge = (globalThis as any)[MANAGER];
    if (!bridge?.workModeSnapshot) return { known: false, items: [] };
    try {
      const snapshot = bridge.workModeSnapshot();
      return {
        known: true,
        items: [
          ...snapshot.agents.map((a: any) => `${a.id} [${a.status}] ${a.type}: ${a.description ?? ""}`),
          ...snapshot.workflows.map((w: any) => `${w.id} [${w.status}] workflow: ${w.name}`),
        ],
      };
    } catch { return { known: false, items: [] }; }
  }

  function tell(ctx: ExtensionContext, text: string, warning = false) {
    if (ctx.hasUI) ctx.ui.notify(text, warning ? "warning" : "info");
    else pi.sendMessage({ customType: "work-mode-status", content: text, display: true });
  }

  async function switchMode(next: Mode, ctx: ExtensionContext) {
    restore(ctx);
    if (!ctx.isIdle() || inFlight.size) {
      tell(ctx, "当前主会话/派发调用仍在运行，请等待结束后切换。未停止任何任务。", true);
      return;
    }
    if (ranks[next] < ranks[mode]) {
      const state = activity();
      if (!state.known) {
        tell(ctx, "无法确认子代理/工作流状态，拒绝降档。请检查 vendor 状态补丁和 /agents。", true);
        return;
      }
      if (state.items.length) {
        tell(ctx, `尚有运行/排队/暂停的工作，保持 ${mode.toUpperCase()}。请等待或在 /agents 明确停止后再切换：\n${state.items.join("\n")}`, true);
        return;
      }
    }
    // No await between admission check and switch: a later cascade/timer sees the new gate.
    mode = next;
    pi.appendEntry(ENTRY, { sessionId: owner, mode });
    apply(ctx);
    tell(ctx, `已切换 ${mode.toUpperCase()}。${mode === "solo" ? "主会话直接执行；子代理、任务跟踪和工作流入口关闭。" : mode === "team" ? "按需使用六个角色和任务跟踪；工作流关闭。" : "工作流能力开放；仍须明确请求编排，不自动启动。"}`);
  }

  for (const name of ["solo", "team", "flow"] as const) {
    pi.registerCommand(name, {
      description: { solo: "单人模式：关闭子代理、任务跟踪和工作流", team: "协作模式：按需调用角色和跟踪任务", flow: "工作流模式：开放明确授权的脚本编排" }[name],
      handler: async (args, ctx) => {
        if (args.trim()) { tell(ctx, `请单独输入 /${name}，任务内容在下一条消息发送。`, true); return; }
        await switchMode(name, ctx);
      },
    });
  }
  pi.registerCommand("workmode", {
    description: "查看模式、受控工具及运行状态；/workmode solo|team|flow 切换",
    getArgumentCompletions: prefix => ["solo", "team", "flow"].filter(n => n.startsWith(prefix)).map(n => ({ value: n, label: n })),
    handler: async (args, ctx) => {
      const arg = args.trim();
      if (isMode(arg)) { await switchMode(arg, ctx); return; }
      apply(ctx);
      const state = activity();
      tell(ctx, `当前 ${mode.toUpperCase()} | 新会话默认 SOLO，当前会话 reload/resume 保留。\n/solo 单人；/team 按需协作；/flow 明确授权后编排。\n受控可用工具：${pi.getActiveTools().filter(n => managed.has(n)).join(", ") || "无"}\n运行状态：${state.known ? state.items.join("\n") || "无运行中的代理/工作流" : "未知（状态桥不可用）"}\n保留 get_subagent_result / TaskOutput / TaskStop 供取结果和停止。/agents、/tasks 管理菜单仍可由用户使用；这不是系统沙箱。定时任务默认关闭，开启需另行明确配置。`);
    },
  });

  pi.on("session_start", (_event, ctx) => apply(ctx));
  pi.on("before_agent_start", (event, ctx) => {
    apply(ctx);
    event.systemPromptOptions.sections["work_mode"] = `当前主会话工作模式：${mode.toUpperCase()}。只有用户的 /solo /team /flow /workmode 命令可以切换，不能自行用脚本或子进程绕过。
${mode === "solo" ? "直接使用主会话完成工作，不使用子代理、Task 系列任务跟踪或 SubagentWorkflow。复杂工作可以在回复中给简短计划。若用户要求委派，提示先 /team；不要替用户切换。" : mode === "team" ? "按任务收益选择角色，必要时用任务工具；不调用 SubagentWorkflow，不用 shell 模拟编排。小任务仍直接做。" : "按需使用角色与任务工具。仅在用户明确要求 workflow/编排时使用 SubagentWorkflow；开启 FLOW 本身不是每个任务的编排授权。"}
主会话的六角色路由：scout 本地定位；researcher 网上查证；browser-operator 本地 Chrome；office-operator Office；worker 代码与相关测试；reviewer 通用独立验收。worker 调用省略 model/thinking 以继承主会话。角色不是固定流水线，只调用需要的角色。
主会话交接必须包含目标、验收条件、输入、允许修改范围、已有授权、输出/临时路径与验证要求。重要多文件改动/数据/外部操作结果完成后安排 reviewer；最多两轮修复复查。浏览器只有一个操作时段，同一个 Office 文件或共享代码文件只能有一个写入者。子角色不得派生或管理主会话任务列表，授权缺口返回主会话。
模式只控制编排入口，不取消既有任务，不删除文件；取结果和停止仍可用。`;
  });
  pi.on("tool_call", (event, ctx) => {
    restore(ctx);
    if (denied(mode, event.toolName)) return { block: true, reason: `${mode.toUpperCase()} 禁用 ${event.toolName}；请用户先切换模式。` };
    if (launchTools.has(event.toolName)) inFlight.add(event.toolCallId);
  });
  pi.on("tool_execution_end", event => { inFlight.delete(event.toolCallId); });
  pi.on("session_shutdown", () => {
    if ((globalThis as any)[POLICY] === policy) delete (globalThis as any)[POLICY];
  });
}
