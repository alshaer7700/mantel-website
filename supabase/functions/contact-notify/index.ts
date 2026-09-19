// contact-notify — emails the café when a contact message arrives.
//
// Why this exists: submit_contact_message (019) writes the row and stops
// there. Between the FormSubmit removal and this function, a customer could
// fill in the contact form and nobody would ever hear about it — the message
// sat in contact_messages unread. This closes that gap.
//
// Called by the AFTER INSERT trigger in 022, never by the browser. That is why
// verify_jwt is off: the caller is Postgres, which holds no user JWT. Auth is
// the shared secret below, compared in constant time. Without that check the
// URL would be an open relay for anyone who guessed it.
//
// Required secrets (Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY          Resend API key
//   CONTACT_NOTIFY_SECRET   same value stored in Vault as contact_notify_secret
// Optional:
//   CONTACT_NOTIFY_TO       default hello@bymantel.com
//   CONTACT_NOTIFY_FROM     default Mantel <notifications@bymantel.com>

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TO = Deno.env.get("CONTACT_NOTIFY_TO") ?? "hello@bymantel.com";
// The From address has to sit on the domain verified in Resend — the apex
// bymantel.com, not a subdomain of it. Resend matches it exactly and answers a
// mismatch with a 403. See guidelines/EMAIL.md.
const FROM = Deno.env.get("CONTACT_NOTIFY_FROM") ?? "Mantel <notifications@bymantel.com>";

type ContactRecord = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  created_at?: string;
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

// The message is customer-typed and lands in an HTML email. Escape it.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const expected = Deno.env.get("CONTACT_NOTIFY_SECRET");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!expected || !apiKey) {
    // Misconfiguration is ours, not the caller's. Log loudly; the trigger
    // swallows the failure so the customer's message is still saved.
    console.error("contact-notify: CONTACT_NOTIFY_SECRET or RESEND_API_KEY missing");
    return new Response("not configured", { status: 500 });
  }

  if (!secretMatches(req.headers.get("x-contact-notify-secret") ?? "", expected)) {
    return new Response("forbidden", { status: 403 });
  }

  let record: ContactRecord;
  try {
    const body = await req.json();
    record = (body?.record ?? body) as ContactRecord;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const name = [record.first_name, record.last_name].filter(Boolean).join(" ").trim() || "(no name given)";
  const email = (record.email ?? "").trim();
  const phone = (record.phone ?? "").trim() || "—";
  const message = (record.message ?? "").trim();
  const when = record.created_at ?? new Date().toISOString();

  const text = [
    `New contact message from ${name}`,
    ``,
    `Email:   ${email || "—"}`,
    `Phone:   ${phone}`,
    `Sent:    ${when}`,
    ``,
    message,
  ].join("\n");

  const html = [
    `<h2 style="margin:0 0 16px;font:600 18px/1.3 system-ui,sans-serif">New contact message</h2>`,
    `<table style="font:14px/1.5 system-ui,sans-serif;border-collapse:collapse">`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Name</td><td>${esc(name)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Email</td><td>${esc(email || "—")}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Phone</td><td>${esc(phone)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;color:#666">Sent</td><td>${esc(when)}</td></tr>`,
    `</table>`,
    `<p style="font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap;margin:16px 0 0">${esc(message)}</p>`,
  ].join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      // Hitting reply in the café's inbox should answer the customer, not us.
      ...(email ? { reply_to: email } : {}),
      subject: `Contact form — ${name}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("contact-notify: Resend rejected the send", res.status, detail);
    return new Response("send failed", { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true, id: record.id ?? null }), {
    headers: { "Content-Type": "application/json" },
  });
});
