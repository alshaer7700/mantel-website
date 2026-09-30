// The newsletter email, as HTML and plain text.
//
// Plain TypeScript with no Deno or browser APIs, because it has two users:
// the newsletter-send edge function, which sends it, and the dashboard, which
// imports this same file to show the preview — so what staff see is exactly
// what subscribers get.

export type NewsletterContent = {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  image_url: string;
  button_label: string;
  button_url: string;
};

export type NewsletterHead = {
  name: string;
  logo_url: string;
  address: string;
  email: string;
  instagram: string;
};

export const DEFAULT_NEWSLETTER_HEAD: NewsletterHead = {
  name: "MANTEL.",
  logo_url: "https://bymantel.com/heart.png",
  address: "Hidd, Kingdom of Bahrain",
  email: "hello@bymantel.com",
  instagram: "mantelbh",
};

const INK = "#171310";
const MUTED = "#766E66";
const LINE = "#E8E4DC";
const SERIF = "font-family:'EB Garamond',Georgia,'Times New Roman',serif;";
const MONO = "font-family:'Fira Mono',Menlo,Consolas,'Courier New',monospace;";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function handleOf(instagram: string): string {
  return instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
}

/** A link a subscriber can safely click: http(s), or a bymantel.com page given as "/menu". */
export function safeUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("/")) return `https://bymantel.com${u}`;
  return /^https?:\/\//i.test(u) ? u : "";
}

/** Blank lines separate paragraphs; single line breaks stay inside one. */
function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function renderNewsletter(c: NewsletterContent, head: NewsletterHead, unsubscribeUrl: string): { html: string; text: string } {
  const handle = handleOf(head.instagram);
  const button = safeUrl(c.button_url);
  const image = safeUrl(c.image_url);
  const paras = paragraphs(c.body);

  const html = [
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:#F6F5F2">`,
    c.preheader.trim()
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.preheader.trim())}${"&nbsp;&zwnj;".repeat(40)}</div>`
      : "",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F5F2"><tr><td align="center" style="padding:24px 12px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #D9D4CB">`,
    // Masthead
    `<tr><td style="padding:28px 32px 0">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>`,
    `<td style="vertical-align:middle;${MONO}font-size:26px;letter-spacing:-0.02em;color:${INK};line-height:1">${esc(head.name)}</td>`,
    head.logo_url
      ? `<td style="vertical-align:middle;text-align:right;width:52px"><img src="${esc(head.logo_url)}" width="40" alt="" style="display:block;margin-left:auto;width:40px;height:auto;border:0"></td>`
      : "",
    `</tr></table>`,
    `<div style="height:1px;background:${INK};margin:22px 0 0;line-height:1px;font-size:0">&nbsp;</div>`,
    `</td></tr>`,
    // Photo
    image
      ? `<tr><td style="padding:28px 32px 0"><img src="${esc(image)}" width="536" alt="" style="display:block;width:100%;max-width:536px;height:auto;border:0"></td></tr>`
      : "",
    // Words
    `<tr><td style="padding:28px 32px 8px">`,
    c.heading.trim()
      ? `<h1 style="margin:0 0 18px;${SERIF}font-size:30px;font-weight:500;line-height:1.1;letter-spacing:-0.01em;color:${INK}">${esc(c.heading.trim())}</h1>`
      : "",
    ...paras.map((p) => `<p style="margin:0 0 16px;${SERIF}font-size:17px;line-height:1.55;color:${INK}">${esc(p).replace(/\n/g, "<br>")}</p>`),
    button && c.button_label.trim()
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 16px"><tr><td style="background:${INK}"><a href="${esc(button)}" style="display:inline-block;padding:13px 22px;${MONO}font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#FFFFFF;text-decoration:none">${esc(c.button_label.trim())}</a></td></tr></table>`
      : "",
    `</td></tr>`,
    // Footer
    `<tr><td style="padding:8px 32px 28px">`,
    `<div style="height:1px;background:${LINE};line-height:1px;font-size:0;margin:0 0 16px">&nbsp;</div>`,
    `<p style="margin:0 0 6px;${MONO}font-size:11px;line-height:1.6;color:${MUTED}">`,
    [
      head.email.trim() ? `<a href="mailto:${esc(head.email.trim())}" style="color:${MUTED}">${esc(head.email.trim())}</a>` : "",
      handle ? `<a href="https://www.instagram.com/${encodeURIComponent(handle)}" style="color:${MUTED}">@${esc(handle)}</a>` : "",
    ].filter(Boolean).join(" &nbsp;·&nbsp; "),
    `</p>`,
    head.address.trim() ? `<p style="margin:0 0 6px;${MONO}font-size:11px;line-height:1.6;color:${MUTED}">${esc(head.address.trim())}</p>` : "",
    `<p style="margin:0;${MONO}font-size:11px;line-height:1.6;color:${MUTED}">You're getting this because you signed up at bymantel.com. `,
    `<a href="${esc(unsubscribeUrl)}" style="color:${MUTED}">Unsubscribe</a></p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr></table>`,
    `</body></html>`,
  ].join("");

  const text = [
    c.heading.trim(),
    ...paras,
    button && c.button_label.trim() ? `${c.button_label.trim()}: ${button}` : "",
    "—",
    [head.email.trim(), handle ? `@${handle}` : ""].filter(Boolean).join(" · "),
    head.address.trim(),
    `Unsubscribe: ${unsubscribeUrl}`,
  ].filter(Boolean).join("\n\n");

  return { html, text };
}
