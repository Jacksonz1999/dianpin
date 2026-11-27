export interface ServerErrorContext {
  path?: string;
  method?: string;
  routePath?: string;
  routeType?: string;
  digest?: string;
}

function sanitizeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/https?:\/\/[^\s"']+/gi, "https://[redacted]")
    .slice(0, 800);
}

function safePath(path: string | undefined): string {
  if (!path) return "unknown";
  try {
    // Query strings are deliberately excluded: auth callbacks and login next
    // parameters can contain one-time credentials or personal information.
    return new URL(path, "https://dianpin.local").pathname;
  } catch {
    return "invalid";
  }
}

export async function reportServerError(
  error: unknown,
  context: ServerErrorContext = {}
): Promise<void> {
  const event = {
    timestamp: new Date().toISOString(),
    level: "error",
    service: "dianpin-web",
    errorName: error instanceof Error ? error.name : "NonError",
    message: sanitizeMessage(error),
    digest: context.digest?.slice(0, 160),
    path: safePath(context.path),
    method: context.method ?? "unknown",
    routePath: context.routePath,
    routeType: context.routeType,
  };
  console.error(JSON.stringify(event));

  const webhook = process.env.ERROR_ALERT_WEBHOOK_URL;
  if (process.env.NODE_ENV !== "production" || !webhook) return;

  const text = [
    "[DianPin] Server error",
    `${event.method} ${event.path}`,
    event.routePath ? `route=${event.routePath} (${event.routeType ?? "unknown"})` : null,
    `${event.errorName}: ${event.message}`,
    event.digest ? `digest=${event.digest}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2500);
  const body =
    process.env.ERROR_ALERT_WEBHOOK_TYPE === "feishu"
      ? { msg_type: "text", content: { text } }
      : { text };

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      console.error(
        JSON.stringify({ level: "warn", service: "monitoring", status: response.status })
      );
    }
  } catch {
    // Monitoring must never become another request failure. Do not log the
    // webhook URL or its response body, which may contain credentials.
    console.error(
      JSON.stringify({ level: "warn", service: "monitoring", status: "unreachable" })
    );
  }
}
