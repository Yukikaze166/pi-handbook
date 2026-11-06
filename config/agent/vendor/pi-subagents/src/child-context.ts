import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Marks resource loading/session construction performed for a subagent. This is
 * async-context-local so concurrent top-level extension work is unaffected.
 */
// Pi loads each extension with its own Jiti module cache. Share the async-local
// marker across those module instances, without sharing state between async runs.
const CHILD_CONTEXT_KEY = Symbol.for("pi-subagents:child-session-context:v1");
const childSessionContext: AsyncLocalStorage<boolean> =
  ((globalThis as any)[CHILD_CONTEXT_KEY] ??= new AsyncLocalStorage<boolean>());

export function inChildSessionContext(): boolean {
  return childSessionContext.getStore() === true;
}

export function runInChildSessionContext<T>(fn: () => Promise<T>): Promise<T> {
  return childSessionContext.run(true, fn);
}
