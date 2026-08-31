type MonitorContext = Record<string, string | number | boolean | undefined>;

const endpoint = typeof import.meta !== "undefined" ? import.meta.env.VITE_MONITORING_ENDPOINT : undefined;
let lastReportAt = 0;
const REPORT_COOLDOWN_MS = 10_000;

function cleanContext(context: MonitorContext): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined).map(([key, value]) => [key, value as string | number | boolean]),
  );
}

export function reportClientError(error: unknown, context: MonitorContext = {}): void {
  const now = Date.now();
  if (now - lastReportAt < REPORT_COOLDOWN_MS) return;
  lastReportAt = now;

  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack?.slice(0, 4000) }
    : { name: "UnknownError", message: String(error).slice(0, 1000) };
  const payload = JSON.stringify({
    ...normalized,
    context: cleanContext({ ...context, path: window.location.pathname }),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });

  if (import.meta.env.DEV) {
    console.error("[Mantel monitor]", normalized, context);
    return;
  }
  if (!endpoint) return;

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
    } else {
      void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
    }
  } catch {
    // Monitoring must never interrupt the customer journey.
  }
}

export function installMonitoring(): () => void {
  const onError = (event: ErrorEvent) => reportClientError(event.error ?? event.message, { source: "window" });
  const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason, { source: "unhandled-rejection" });
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
