// order-notify — emails the café when an order is placed.
//
// Why this exists: place_order (009/014) writes the order and its lines and
// stops there. Nothing tells anyone. An order sat in `orders` until a staff
// member happened to open the dashboard — which for a pick-up café is the
// whole product failing quietly: the customer is walking over for a coffee
// nobody has started making. This is roadmap item M-1.
//
// The sibling of contact-notify (022), and deliberately built the same way so
// there is one shape to understand rather than two. Called by the deferred
// constraint trigger in 024, never by the browser. That is why verify_jwt is
// off: the caller is Postgres, which holds no user JWT. Auth is the shared
// secret below, compared in constant time. Without that check the URL would be
// an open relay for anyone who guessed it.
//
// Required secrets (Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY        Resend API key (already set for contact-notify)
//   ORDER_NOTIFY_SECRET   same value stored in Vault as order_notify_secret
// Optional:
//   ORDER_NOTIFY_TO       default hello@bymantel.com
//   ORDER_NOTIFY_FROM     default Mantel <notifications@bymantel.com> — the
//                         domain verified in Resend is bymantel.com itself,
//                         not a send. subdomain, so FROM has to match that.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TO = Deno.env.get("ORDER_NOTIFY_TO") ?? "hello@bymantel.com";
const FROM = Deno.env.get("ORDER_NOTIFY_FROM") ?? "Mantel <notifications@bymantel.com>";

type OrderLine = {
  item_name?: string;
  quantity?: number;
  item_price?: number | string;
};

type OrderRecord = {
  id?: string;
  reference?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  subtotal?: number | string;
  payment_method?: string;
  pickup_at?: string | null;
  created_at?: string;
  items?: OrderLine[];
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

// Item names come from the database, not from the customer, but they land in
// an HTML email and the customer's own name does not — so escape everything
// rather than reasoning per-field about which is safe today.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Three decimals: the dinar divides into 1000 fils, and src/lib/format.ts
// prints prices the same way. An email that rounds to 2 disagrees with the
// screen the customer just paid from.
function bd(value: number | string | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? `BD ${(n as number).toFixed(3)}` : "—";
}

// Asia/Bahrain, because the person reading this is standing in the café. The
// stored value is timestamptz, so the conversion is well-defined; printing UTC
// would have staff mentally subtracting three hours during a rush.
function bahrainTime(iso: string | null | undefined): string {
  if (!iso) return "As soon as it's ready";
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

  const expected = Deno.env.get("ORDER_NOTIFY_SECRET");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!expected || !apiKey) {
    // Misconfiguration is ours, not the caller's. Log loudly; the trigger
    // swallows the failure so the order is still placed.
    console.error("order-notify: ORDER_NOTIFY_SECRET or RESEND_API_KEY missing");
    return new Response("not configured", { status: 500 });
  }

  if (!secretMatches(req.headers.get("x-order-notify-secret") ?? "", expected)) {
    return new Response("forbidden", { status: 403 });
  }

  let record: OrderRecord;
  try {
    const body = await req.json();
    record = (body?.record ?? body) as OrderRecord;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const reference = (record.reference ?? "").trim() || "(no reference)";
  const name = (record.customer_name ?? "").trim() || "Guest";
  const email = (record.customer_email ?? "").trim();
  const phone = (record.customer_phone ?? "").trim() || "—";
  const payment = record.payment_method === "cash" ? "Cash at counter" : "Card";
  const pickup = bahrainTime(record.pickup_at);
  const items = Array.isArray(record.items) ? record.items : [];

  const lines = items.map((i) => {
    const qty = Number(i.quantity) || 0;
    const label = (i.item_name ?? "").trim() || "(unnamed item)";
    return { qty, label, each: i.item_price };
  });

  const text = [
    `New order ${reference} — ${name}`,
    ``,
    `Pick-up:  ${pickup}`,
    `Phone:    ${phone}`,
    `Email:    ${email || "—"}`,
    `Payment:  ${payment}`,
    ``,
    ...lines.map((l) => `  ${l.qty} × ${l.label}   ${bd(l.each)}`),
    ``,
    `Total:    ${bd(record.subtotal)}`,
  ].join("\n");

  const html = [
    `<h2 style="margin:0 0 4px;font:600 18px/1.3 system-ui,sans-serif">New order ${esc(reference)}</h2>`,
    `<p style="margin:0 0 16px;font:14px/1.5 system-ui,sans-serif;color:#666">${esc(name)}</p>`,
    `<table style="font:14px/1.5 system-ui,sans-serif;border-collapse:collapse">`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Pick-up</td><td><strong>${esc(pickup)}</strong></td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Phone</td><td>${esc(phone)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Email</td><td>${esc(email || "—")}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Payment</td><td>${esc(payment)}</td></tr>`,
    `</table>`,
    `<table style="font:14px/1.6 system-ui,sans-serif;border-collapse:collapse;margin:16px 0 0">`,
    ...lines.map(
      (l) =>
        `<tr><td style="padding:2px 12px 2px 0;text-align:right;color:#666">${l.qty} ×</td>` +
        `<td style="padding:2px 16px 2px 0">${esc(l.label)}</td>` +
        `<td style="padding:2px 0;color:#666">${esc(bd(l.each))}</td></tr>`,
    ),
    `<tr><td colspan="2" style="padding:8px 12px 0 0;text-align:right;border-top:1px solid #eee"><strong>Total</strong></td>` +
      `<td style="padding:8px 0 0;border-top:1px solid #eee"><strong>${esc(bd(record.subtotal))}</strong></td></tr>`,
    `</table>`,
  ].join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      // Replying from the café inbox should reach the customer who ordered.
      ...(email ? { reply_to: email } : {}),
      subject: `Order ${reference} — ${name}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("order-notify: Resend rejected the send", res.status, detail);
    return new Response("send failed", { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true, id: record.id ?? null }), {
    headers: { "Content-Type": "application/json" },
  });
});
