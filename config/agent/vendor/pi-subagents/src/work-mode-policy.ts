import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

// Local optional cooperative gate. No extension installed => upstream behavior.
// The main work-mode extension owns this slot; child factories never replace it.
export const WORK_MODE_POLICY = Symbol.for("pi-local:work-mode-policy:v1");
export function assertWorkMode(action: "agent" | "workflow", ctx?: ExtensionContext): void {
  const policy = (globalThis as any)[WORK_MODE_POLICY];
  if (policy) policy.assertAllowed(action, ctx);
}
