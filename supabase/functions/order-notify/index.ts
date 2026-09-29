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

// The café letterhead, as edited in the dashboard (Invoices & letterhead →
// Letterhead, stored in site_settings 'letterhead'): name with the CR number
// and address on top, the logo at the right, and the labelled email and
// Instagram in the footer. Read with the service role the platform gives
// every function; if that read fails, the built-in letterhead is used so the
// order email still goes out. Tables and inline styles only, because that is
// all email clients reliably render.
type Letterhead = { name: string; cr_number: string; address: string; logo_url: string; email: string; instagram: string };

const DEFAULT_HEAD: Letterhead = {
  name: "MANTEL.",
  cr_number: "197765-1",
  address: "SHOP 114D, BLDG 114, ROAD 16, BLOCK 111, HIDD, KINGDOM OF BAHRAIN",
  logo_url: "https://bymantel.com/heart.webp",
  email: "hello@bymantel.com",
  instagram: "bymantel",
};

async function loadLetterhead(): Promise<Letterhead> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return DEFAULT_HEAD;
  try {
    const res = await fetch(`${url}/rest/v1/site_settings?key=eq.letterhead&select=value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return DEFAULT_HEAD;
    const rows = await res.json();
    const value = Array.isArray(rows) ? rows[0]?.value : null;
    if (!value || typeof value !== "object") return DEFAULT_HEAD;
    const pick = (k: keyof Letterhead) => (typeof value[k] === "string" ? String(value[k]).trim() : DEFAULT_HEAD[k]);
    return { name: pick("name"), cr_number: pick("cr_number"), address: pick("address"), logo_url: pick("logo_url"), email: pick("email"), instagram: pick("instagram") };
  } catch {
    return DEFAULT_HEAD;
  }
}

function handleOf(value: string): string {
  return value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?].*$/, "").replace(/^@/, "");
}

const INK = "#171310";
const INK_2 = "#3A342D";
const MUTED = "#766E66";
const LINE = "#E8E4DC";
const MONO = "font-family:'Fira Mono',Menlo,Consolas,'Courier New',monospace;";
const SERIF = "font-family:'EB Garamond',Georgia,'Times New Roman',serif;";

function detailRow(label: string, value: string): string {
  // Both cells sit on one baseline: the small label and the larger value
  // read as one line instead of the label floating above.
  return `<tr><td style="padding:5px 20px 5px 0;${MONO}font-size:11px;line-height:22px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};white-space:nowrap;width:1%;vertical-align:baseline">${label}</td>` +
    `<td style="padding:5px 0;line-height:22px;vertical-align:baseline">${value}</td></tr>`;
}

function footerItem(label: string, href: string, value: string, align: "left" | "right"): string {
  return `<td style="vertical-align:top;text-align:${align}">` +
    `<div style="${MONO}font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED}">${label}</div>` +
    `<div style="margin-top:4px;${MONO}font-size:12px;font-weight:700"><a href="${href}" style="color:${INK};text-decoration:none">${value}</a></div>` +
    `</td>`;
}

function letterhead(body: string, head: Letterhead): string {
  const handle = handleOf(head.instagram);
  const email = head.email.trim();
  return [
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>`,
    `<body style="margin:0;padding:0;background:#F6F5F2">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F5F2"><tr><td align="center" style="padding:24px 12px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #D9D4CB">`,
    // Letterhead
    `<tr><td style="padding:32px 32px 0">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`,
    `<td style="vertical-align:top">`,
    `<div style="${MONO}font-size:30px;line-height:1;letter-spacing:-1px;color:${INK}">${esc(head.name)}</div>`,
    head.cr_number ? `<div style="margin-top:14px;${SERIF}font-size:11px;letter-spacing:0.5px;color:${INK}">CR No.${esc(head.cr_number)}</div>` : "",
    head.address ? `<div style="margin-top:6px;${SERIF}font-size:11px;letter-spacing:0.5px;color:${INK}">${esc(head.address)}</div>` : "",
    `</td>`,
    head.logo_url ? `<td style="vertical-align:top;text-align:right;width:56px"><img src="${esc(head.logo_url)}" width="44" alt="${esc(head.name)}" style="display:block;margin-left:auto;width:44px;height:auto;border:0"></td>` : "",
    `</tr></table>`,
    `<div style="height:1px;background:${INK};margin:24px 0 0;line-height:1px;font-size:0">&nbsp;</div>`,
    `</td></tr>`,
    // Body
    `<tr><td style="padding:28px 32px 36px">${body}</td></tr>`,
    // Footer
    email || handle ? [
      `<tr><td style="padding:0 32px 28px">`,
      `<div style="height:1px;background:${LINE};line-height:1px;font-size:0;margin:0 0 18px">&nbsp;</div>`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`,
      email ? footerItem("Email", `mailto:${esc(email)}`, esc(email), "left") : `<td></td>`,
      handle ? footerItem("Instagram", `https://www.instagram.com/${encodeURIComponent(handle)}`, `@${esc(handle)}`, "right") : `<td></td>`,
      `</tr></table>`,
      `</td></tr>`,
    ].join("") : "",
    `</table>`,
    `</td></tr></table>`,
    `</body></html>`,
  ].join("");
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

  const head = await loadLetterhead();
  const handle = handleOf(head.instagram);

  const text = [
    head.name,
    ...(head.cr_number ? [`CR No.${head.cr_number}`] : []),
    ...(head.address ? [head.address] : []),
    ``,
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
    ``,
    `—`,
    ...(head.email ? [`Email:      ${head.email}`] : []),
    ...(handle ? [`Instagram:  @${handle}`] : []),
  ].join("\n");

  const html = letterhead([
    `<p style="margin:0 0 6px;${MONO}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED}">New order</p>`,
    `<h1 style="margin:0 0 2px;${MONO}font-size:24px;font-weight:700;letter-spacing:-0.5px;color:${INK}">${esc(reference)}</h1>`,
    `<p style="margin:0 0 24px;${SERIF}font-size:17px;color:${INK_2}">${esc(name)}</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;${SERIF}font-size:15px;line-height:1.5;color:${INK}">`,
    detailRow("Pick-up", `<strong>${esc(pickup)}</strong>`),
    detailRow("Phone", esc(phone)),
    detailRow("Email", email ? `<a href="mailto:${esc(email)}" style="color:${INK}">${esc(email)}</a>` : "—"),
    detailRow("Payment", esc(payment)),
    `</table>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:24px 0 0;${SERIF}font-size:15px;line-height:1.5;color:${INK}">`,
    ...lines.map(
      (l) =>
        `<tr><td style="padding:10px 12px 10px 0;border-top:1px solid ${LINE};${MONO}font-size:13px;line-height:22px;color:${MUTED};white-space:nowrap;width:1%;vertical-align:baseline">${l.qty} ×</td>` +
        `<td style="padding:10px 12px 10px 0;border-top:1px solid ${LINE};line-height:22px;vertical-align:baseline">${esc(l.label)}</td>` +
        `<td style="padding:10px 0;border-top:1px solid ${LINE};${MONO}font-size:13px;line-height:22px;color:${MUTED};text-align:right;white-space:nowrap;vertical-align:baseline">${esc(bd(l.each))}</td></tr>`,
    ),
    `<tr><td colspan="2" style="padding:12px 12px 0 0;border-top:1px solid ${INK};${MONO}font-size:12px;line-height:22px;letter-spacing:2px;text-transform:uppercase;vertical-align:baseline">Total</td>` +
      `<td style="padding:12px 0 0;border-top:1px solid ${INK};${MONO}font-size:15px;line-height:22px;font-weight:700;text-align:right;white-space:nowrap;vertical-align:baseline">${esc(bd(record.subtotal))}</td></tr>`,
    `</table>`,
  ].join(""), head);

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
