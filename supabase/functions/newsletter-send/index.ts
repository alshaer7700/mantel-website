// newsletter-send — sends a newsletter from the dashboard, and handles the
// one-click unsubscribe that Gmail and Apple Mail offer.
//
//   POST { id, test }            with the staff member's own session. `test`
//                                sends one copy to them; otherwise every active
//                                subscriber gets it, once.
//   POST ?t=<token>              RFC 8058 one-click unsubscribe (the
//                                List-Unsubscribe-Post header). No session.
//
// verify_jwt is off because the one-click unsubscribe arrives from a mail
// provider with no session. Sending is still staff-only: the function asks the
// database to start the send AS the caller (their Authorization header), and
// admin_newsletter_start() refuses anyone without the 'marketing' permission
// (supabase/036). The service role is used only to read the subscriber list
// and the letterhead and to log what was sent.
//
// Secrets: RESEND_API_KEY (shared with the other notification functions).
// Optional: NEWSLETTER_FROM, default "Mantel <news@bymantel.com>" — any
// address at bymantel.com works, the domain is verified in Resend.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { DEFAULT_NEWSLETTER_HEAD, renderNewsletter, type NewsletterContent, type NewsletterHead } from "./template.ts";

const FROM = Deno.env.get("NEWSLETTER_FROM") ?? "Mantel <news@bymantel.com>";
const REPLY_TO = "hello@bymantel.com";
const SITE = "https://bymantel.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const env = (k: string) => Deno.env.get(k) ?? "";

async function rest(path: string, init: RequestInit, auth: string): Promise<Response> {
  return await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env("SUPABASE_ANON_KEY") || env("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: auth,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const service = () => `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`;

/** A Postgres error's own sentence, for the dashboard to show. */
async function errorOf(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.message === "string" ? body.message : `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

async function letterhead(): Promise<NewsletterHead> {
  try {
    const res = await rest("site_settings?key=eq.letterhead&select=value", { method: "GET" }, service());
    const rows = await res.json();
    const v = rows?.[0]?.value ?? {};
    const pick = (k: keyof NewsletterHead) => (typeof v[k] === "string" && v[k].trim() ? String(v[k]).trim() : DEFAULT_NEWSLETTER_HEAD[k]);
    const logo = pick("logo_url");
    return {
      name: pick("name"),
      // Gmail blackens a transparent WebP; the heart is served as a PNG.
      logo_url: logo === "https://bymantel.com/heart.webp" ? DEFAULT_NEWSLETTER_HEAD.logo_url : logo,
      address: pick("address"),
      email: pick("email"),
      instagram: pick("instagram"),
    };
  } catch {
    return DEFAULT_NEWSLETTER_HEAD;
  }
}

type Recipient = { email: string; token: string | null };

async function sendBatch(c: NewsletterContent, head: NewsletterHead, batch: Recipient[]): Promise<{ ids: (string | null)[]; error: string | null }> {
  const emails = batch.map((r) => {
    const pageUrl = r.token ? `${SITE}/unsubscribe?t=${r.token}` : `${SITE}/unsubscribe`;
    const { html, text } = renderNewsletter(c, head, pageUrl);
    const headers: Record<string, string> = {};
    if (r.token) {
      headers["List-Unsubscribe"] = `<${env("SUPABASE_URL")}/functions/v1/newsletter-send?t=${r.token}>, <mailto:${REPLY_TO}?subject=unsubscribe>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
    return { from: FROM, to: [r.email], reply_to: REPLY_TO, subject: c.subject, html, text, headers };
  });
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify(emails),
  });
  if (!res.ok) return { ids: batch.map(() => null), error: await errorOf(res) };
  const body = await res.json().catch(() => ({}));
  const data: { id?: string }[] = Array.isArray(body?.data) ? body.data : [];
  return { ids: batch.map((_, i) => data[i]?.id ?? null), error: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // One-click unsubscribe from the mail app.
  const token = new URL(req.url).searchParams.get("t");
  if (token) {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ ok: false }, 400);
    await rest("rpc/newsletter_unsubscribe", { method: "POST", body: JSON.stringify({ p_token: token }) }, `Bearer ${env("SUPABASE_ANON_KEY")}`);
    return json({ ok: true });
  }

  if (!env("RESEND_API_KEY")) return json({ error: "Email sending isn't set up (RESEND_API_KEY is missing)." }, 500);

  const auth = req.headers.get("Authorization") ?? "";
  let input: { id?: string; test?: boolean };
  try {
    input = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (!input.id) return json({ error: "bad request" }, 400);
  const test = input.test === true;

  // Starting the send as the caller is the permission check.
  const start = await rest("rpc/admin_newsletter_start", { method: "POST", body: JSON.stringify({ p_id: input.id, p_test: test }) }, auth);
  if (!start.ok) return json({ error: await errorOf(start) }, start.status === 401 || start.status === 403 ? 403 : 400);
  const started = await start.json();
  const c = started.campaign as NewsletterContent;
  const head = await letterhead();

  let recipients: Recipient[];
  if (test) {
    if (!started.to) return json({ error: "Your account has no email address." }, 400);
    recipients = [{ email: started.to, token: null }];
    c.subject = `[Test] ${c.subject}`;
  } else {
    const res = await rest("newsletter_subscribers?status=eq.active&select=email,token", { method: "GET" }, service());
    recipients = res.ok ? await res.json() : [];
  }

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;
  const log: Record<string, unknown>[] = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100);
    const r = await sendBatch(c, head, batch);
    if (r.error) lastError = r.error;
    batch.forEach((rec, k) => {
      const ok = !r.error;
      if (ok) sent += 1;
      else failed += 1;
      log.push({ kind: test ? "newsletter_test" : "newsletter", recipient: rec.email, subject: c.subject, status: ok ? "sent" : "failed", error: ok ? null : r.error, provider_id: r.ids[k], related_id: input.id });
    });
    // Resend allows a couple of requests a second.
    if (i + 100 < recipients.length) await new Promise((res) => setTimeout(res, 600));
  }

  if (log.length) await rest("email_log", { method: "POST", body: JSON.stringify(log), headers: { Prefer: "return=minimal" } }, service());

  if (!test) {
    await rest("rpc/admin_newsletter_finish", { method: "POST", body: JSON.stringify({ p_id: input.id, p_sent: sent, p_failed: failed, p_error: lastError }) }, auth);
  }

  if (sent === 0) return json({ error: lastError ?? "Nothing was sent.", sent, failed }, 502);
  return json({ sent, failed, to: test ? started.to : undefined });
});
