import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Cache-friendly current-time context for Pi.
 *
 * A fresh, ephemeral user-context message is appended immediately before each
 * model request. It is not displayed or persisted, and because it is appended
 * after the existing conversation it does not invalidate the reusable prefix.
 */

interface TimeSnapshot {
  local: string;
  utc: string;
  timeZone: string;
  unixMilliseconds: number;
}

type TimestampPart =
  | "day"
  | "hour"
  | "minute"
  | "month"
  | "second"
  | "timeZoneName"
  | "year";

const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const localFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: systemTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "longOffset",
});

function takeSnapshot(now = new Date()): TimeSnapshot {
  const parts = Object.fromEntries(
    localFormatter.formatToParts(now).map((part) => [part.type, part.value]),
  ) as Record<TimestampPart, string>;

  const offset =
    parts.timeZoneName === "GMT"
      ? "+00:00"
      : parts.timeZoneName.replace(/^GMT/, "");

  return {
    local:
      `${parts.year}-${parts.month}-${parts.day}` +
      `T${parts.hour}:${parts.minute}:${parts.second}` +
      `${offset}[${systemTimeZone}]`,
    utc: now.toISOString(),
    timeZone: systemTimeZone,
    unixMilliseconds: now.getTime(),
  };
}

function renderContext(snapshot: TimeSnapshot): string {
  return [
    "<current_datetime>",
    `Local: ${snapshot.local}`,
    `UTC: ${snapshot.utc}`,
    "Sampled immediately before this model request.",
    "</current_datetime>",
  ].join("\n");
}

export default function timestampExtension(pi: ExtensionAPI) {
  pi.on("context", (event) => {
    const snapshot = takeSnapshot();
    return {
      messages: [
        ...event.messages,
        {
          role: "user",
          content: [{ type: "text", text: renderContext(snapshot) }],
          timestamp: snapshot.unixMilliseconds,
        },
      ],
    };
  });
}
