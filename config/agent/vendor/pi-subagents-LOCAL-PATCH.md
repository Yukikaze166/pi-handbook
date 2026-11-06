# Local patch: pi-subagents 0.23.1

Installed as a local package (not from npm) so the transcript location patch survives.

- Package: `@tintinweb/pi-subagents@0.23.1`
- Location: `~/.pi/agent/vendor/pi-subagents`
- Registered in `~/.pi/agent/settings.json` as `vendor\pi-subagents`
- Runtime deps installed locally: `croner`, `nanoid`

## What was changed

File: `src/output-file.ts`, function `sessionTaskDir()`.

Original behavior wrote subagent `.output` transcripts and `SubagentWorkflow`
scripts/journals to the OS temp directory:

    <tmpdir>/pi-subagents-<uid>/<encoded-cwd>/<sessionId>/tasks/

Patched behavior:

    <cwd>/.pi/tmp/<sessionId>/pi-subagents/tasks/

`PI_SUBAGENTS_TMP` can override the root; the original per-cwd/session layout is
kept underneath the override. If the project directory is not writable, the
function falls back to the original OS-temp layout instead of failing a spawn.

## Updating upstream

`pi update` does not update local-path packages. To move to a newer release:

1. Extract the new tarball over `vendor/pi-subagents` (or into a new directory).
2. Re-apply the `sessionTaskDir()` patch above AND the work-mode compatibility patches listed below. Do not replace the vendor copy without reviewing these integrations.
3. Run `npm install --omit=dev --omit=peer` in the package directory if its
   runtime dependencies changed.
4. Restart pi.

## Work-mode compatibility patches

The separate global `extensions/work-mode.ts` supplies `/solo`, `/team`, `/flow`,
and `/workmode`. Six global role files live in `agents/`. New sessions default to
SOLO; mode entries and mode-owned hidden tool names persist in the session.
Only user slash commands change mode. Ordinary browser/Office/code tools are not
switched off. Result/stop tools remain available. `/agents` and `/tasks` remain
user management surfaces; this is not an operating-system sandbox.

Vendor changes required by this extension:
- `src/agent-types.ts`: add `createPowerShellTool()` to known built-ins (upstream
  coding/read-only factory union omits it).
- `src/child-context.ts`: share AsyncLocalStorage through a global Symbol so
  independent Jiti module caches still recognize child factories. Children must
  not replace the root work-mode policy or create another manager.
- New `src/work-mode-policy.ts`: optional cooperative policy bridge under
  `Symbol.for("pi-local:work-mode-policy:v1")`.
- `src/agent-manager.ts`: check admission before spawn/resume; reject an
  unresolvable role-pinned model rather than silently falling back.
- `src/index.ts`: gate actual workflow execution and expose read-only
  `workModeSnapshot()` through the existing manager bridge, including queued
  agents and running/paused workflows for downgrade checks.

Global `subagents.json` disables default agents and scheduling; nesting remains
capped at 1. `tasks-config.json` explicitly disables autoCascade. Internal task
store maintenance and user management menus are not blocked by the tool filter.
Worker inherits model/thinking when callers omit overrides.

## Validation status

Historical local validation (not re-run by publishing this document):
six roles actually invoked; scout/researcher/Office/worker
models and thinking confirmed from session records; TaskExecute/TaskOutput chain
passed. Browser role model/tools confirmed, but browser connection blocked because
the existing default daemon was not running. A resume tool-restoration defect was
fixed by persisting only mode-owned removals; 10 focused mock-host regression
checks passed. Actual TUI reload/resume and FLOW execution still need validation.
The old `selftest-results.json` is historical failed evidence, not a current pass.

## Local evidence and publication

Local backups and regression evidence use the following project-relative layout:

    <project>/.pi/tmp/<sessionId>/work-mode-setup/

This is a path template, not a directory included in the public distribution.
Keep local backups, session records, regression artifacts, credentials, and
`node_modules` out of the published snapshot. Preserve upstream license notices
when distributing the patched package. Do not delete local evidence without the
user's confirmation.
