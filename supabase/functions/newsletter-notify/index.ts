// newsletter-notify — emails the café when someone subscribes.
//
// The third of the notification trio, after contact-notify (022) and
// order-notify (024), and built to the same shape so there is one pattern in
// this project rather than three. Called by the trigger in 025, never by the
// browser. verify_jwt is off because the caller is Postgres, which holds no
// user JWT; auth is the shared secret below, compared in constant time.
//
// This is the least urgent of the three and the email says so by being short.
// Nobody needs to act on a signup the way they must act on an order — it is a
// "someone is interested" note, not a task. Resist adding to it.
//
// Required secrets (Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY             Resend API key (shared with the other two)
//   NEWSLETTER_NOTIFY_SECRET   same value stored in Vault as
//                              newsletter_notify_secret
// Optional:
//   NEWSLETTER_NOTIFY_TO       default hello@bymantel.com
//   NEWSLETTER_NOTIFY_FROM     default Mantel <notifications@bymantel.com> —
//                              the domain verified in Resend is bymantel.com
//                              itself, not a send. subdomain, so FROM has to
//                              match that.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TO = Deno.env.get("NEWSLETTER_NOTIFY_TO") ?? "hello@bymantel.com";
const FROM = Deno.env.get("NEWSLETTER_NOTIFY_FROM") ?? "Mantel <notifications@bymantel.com>";

type SubscriberRecord = {
  email?: string;
  subscribed_at?: string;
  /** "new" for a first-time subscriber, "returning" for an unsubscribe reversed. */
  kind?: string;
  /** Active subscribers including this one, counted at trigger time. */
  active_total?: number;
};

// Timing-safe compare. A plain === leaks the shared secret one byte at a time
// to anyone willing to measure the response.
function secretMatches(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// The email address is customer-typed and lands in an HTML email. Escape it.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Asia/Bahrain, for the same reason as order-notify: the person reading this
// is standing in the café, not in UTC.
function bahrainTime(iso: string | null | undefined): string {
  if (!iso) return "just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bahrain",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const expected = Deno.env.get("NEWSLETTER_NOTIFY_SECRET");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!expected || !apiKey) {
    console.error("newsletter-notify: NEWSLETTER_NOTIFY_SECRET or RESEND_API_KEY missing");
    return new Response("not configured", { status: 500 });
  }

  if (!secretMatches(req.headers.get("x-newsletter-notify-secret") ?? "", expected)) {
    return new Response("forbidden", { status: 403 });
  }

  let record: SubscriberRecord;
  try {
    const body = await req.json();
    record = (body?.record ?? body) as SubscriberRecord;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const email = (record.email ?? "").trim();
  if (!email) return new Response("bad request", { status: 400 });

  const returning = record.kind === "returning";
  const when = bahrainTime(record.subscribed_at);
  const total = Number(record.active_total);
  const totalLine = Number.isFinite(total) && total > 0
    ? `That makes ${total} active subscriber${total === 1 ? "" : "s"}.`
    : "";

  const headline = returning ? "Someone re-subscribed" : "New newsletter subscriber";

  const text = [
    headline,
    ``,
    `Email:  ${email}`,
    `When:   ${when}`,
    ...(totalLine ? ["", totalLine] : []),
  ].join("\n");

  const html = [
    `<h2 style="margin:0 0 16px;font:600 18px/1.3 system-ui,sans-serif">${esc(headline)}</h2>`,
    `<table style="font:14px/1.5 system-ui,sans-serif;border-collapse:collapse">`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Email</td><td>${esc(email)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">When</td><td>${esc(when)}</td></tr>`,
    `</table>`,
    ...(totalLine
      ? [`<p style="font:14px/1.6 system-ui,sans-serif;color:#666;margin:16px 0 0">${esc(totalLine)}</p>`]
      : []),
  ].join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      // Deliberately NO reply_to. A subscriber has not written to the café and
      // is not expecting a reply; making it one keystroke to email someone who
      // only ticked a box is the wrong default.
      subject: returning ? `Re-subscribed — ${email}` : `New subscriber — ${email}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("newsletter-notify: Resend rejected the send", res.status, detail);
    return new Response("send failed", { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
