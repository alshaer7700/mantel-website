import templateUrl from "@/admin/assets/letterhead-template.docx?url";
import { getSetting, saveSetting, type Result } from "@/admin/lib/db";
import { currentLang, translate } from "@/admin/i18n";

/*
 * The café letterhead, edited on the Letterhead tab and used by the Word
 * download, invoices and the new-order email (order-notify reads the same
 * 'letterhead' setting).
 */
export type FontKey = "fira-mono" | "eb-garamond" | "georgia" | "times" | "arial" | "verdana" | "courier";

/** Fonts that work in the dashboard, in email and in Word. */
export const FONTS: Record<FontKey, { label: string; css: string; word: string }> = {
  "fira-mono": { label: "Fira Mono", css: `"Fira Mono", Menlo, Consolas, "Courier New", monospace`, word: "Fira Mono" },
  "eb-garamond": { label: "EB Garamond", css: `"EB Garamond", Georgia, "Times New Roman", serif`, word: "EB Garamond" },
  georgia: { label: "Georgia", css: `Georgia, "Times New Roman", serif`, word: "Georgia" },
  times: { label: "Times New Roman", css: `"Times New Roman", Times, serif`, word: "Times New Roman" },
  arial: { label: "Arial", css: `Arial, Helvetica, sans-serif`, word: "Arial" },
  verdana: { label: "Verdana", css: `Verdana, Geneva, sans-serif`, word: "Verdana" },
  courier: { label: "Courier New", css: `"Courier New", Courier, monospace`, word: "Courier New" },
};

/** Like a Word font toolbar. Size in points; spacing in hundredths of the size. */
export type TextStyle = {
  font: FontKey;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  caps: boolean;
  spacing: number;
  color: string;
};

export type StyleKey = "name" | "details" | "labels" | "values" | "body";

export type Letterhead = {
  name: string;
  cr_number: string;
  address: string;
  logo_url: string;
  /** Logo width in millimetres. */
  logo_size: number;
  email: string;
  instagram: string;
  styles: Record<StyleKey, TextStyle>;
};

export const DEFAULT_LOGO = "https://bymantel.com/heart.png";

/** The heart before it became a PNG. Email apps (Gmail especially) turn a
 * transparent WebP's background black, so the letterhead uses the PNG. */
const LEGACY_LOGOS = ["https://bymantel.com/heart.webp"];

export function isDefaultLogo(url: string): boolean {
  return url === DEFAULT_LOGO || LEGACY_LOGOS.includes(url);
}

const style = (font: FontKey, size: number, extra: Partial<TextStyle> = {}): TextStyle => ({
  font, size, bold: false, italic: false, underline: false, caps: false, spacing: 0, color: "#171310", ...extra,
});

export const DEFAULT_STYLES: Record<StyleKey, TextStyle> = {
  name: style("fira-mono", 30, { spacing: -3 }),
  details: style("eb-garamond", 8, { spacing: 4 }),
  labels: style("fira-mono", 6.5, { caps: true, spacing: 15, color: "#766E66" }),
  values: style("fira-mono", 8.5, { bold: true }),
  body: style("eb-garamond", 10.5),
};

export const DEFAULT_LETTERHEAD: Letterhead = {
  name: "MANTEL.",
  cr_number: "197765-1",
  address: "SHOP 114D, BLDG 114, ROAD 16, BLOCK 111, HIDD, KINGDOM OF BAHRAIN",
  logo_url: DEFAULT_LOGO,
  logo_size: 12,
  email: "hello@bymantel.com",
  instagram: "bymantel",
  styles: DEFAULT_STYLES,
};

/** Fills in anything a saved letterhead (or an older invoice's copy) lacks. */
export function withDefaults(raw: Partial<Letterhead> | null | undefined): Letterhead {
  const r = raw ?? {};
  const styles = { ...DEFAULT_STYLES } as Record<StyleKey, TextStyle>;
  for (const key of Object.keys(DEFAULT_STYLES) as StyleKey[]) {
    const saved = r.styles?.[key];
    const merged = { ...DEFAULT_STYLES[key], ...(saved ?? {}) };
    if (!(merged.font in FONTS)) merged.font = DEFAULT_STYLES[key].font;
    styles[key] = merged;
  }
  const merged = { ...DEFAULT_LETTERHEAD, ...r, logo_size: Number(r.logo_size) || DEFAULT_LETTERHEAD.logo_size, styles };
  if (merged.logo_url && isDefaultLogo(merged.logo_url)) merged.logo_url = DEFAULT_LOGO;
  return merged;
}

/** A text style as CSS, for the sheet preview and print. */
export type StyleCss = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  fontStyle: "italic" | "normal";
  textDecoration: "underline" | "none";
  textTransform: "uppercase" | "none";
  letterSpacing: string;
  color: string;
};

export function styleCss(st: TextStyle): StyleCss {
  return {
    fontFamily: FONTS[st.font].css,
    fontSize: `${st.size}pt`,
    fontWeight: st.bold ? 700 : 400,
    fontStyle: st.italic ? "italic" : "normal",
    textDecoration: st.underline ? "underline" : "none",
    textTransform: st.caps ? "uppercase" : "none",
    letterSpacing: `${st.spacing / 100}em`,
    color: st.color,
  };
}

/** A text style as Word run properties. */
function wordRunProps(st: TextStyle): string {
  const f = xmlEscape(FONTS[st.font].word);
  const twips = Math.round((st.spacing / 100) * st.size * 20);
  return `<w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/>` +
    (st.bold ? "<w:b/><w:bCs/>" : "") +
    (st.italic ? "<w:i/><w:iCs/>" : "") +
    (st.caps ? "<w:caps/>" : "") +
    `<w:color w:val="${st.color.replace("#", "").toUpperCase()}"/>` +
    (twips ? `<w:spacing w:val="${twips}"/>` : "") +
    `<w:sz w:val="${Math.round(st.size * 2)}"/><w:szCs w:val="${Math.round(st.size * 2)}"/>` +
    (st.underline ? `<w:u w:val="single"/>` : "") +
    `</w:rPr>`;
}

export type InvoiceSettings = {
  /** The middle part of every number: INV-MTL-001. */
  code: string;
  invoice_prefix: string;
  receipt_prefix: string;
  letter_prefix: string;
  letter_signoff: string;
  letter_signature: string;
  vat_registered: boolean;
  vat_number: string;
  vat_rate: number;
  due_days: number;
  bank_details: string;
  default_notes: string;
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  code: "MTL",
  invoice_prefix: "INV",
  receipt_prefix: "REC",
  letter_prefix: "LTR",
  letter_signoff: "Kind regards,",
  letter_signature: "Mantel",
  vat_registered: false,
  vat_number: "",
  vat_rate: 10,
  due_days: 7,
  bank_details: "",
  default_notes: "Thank you.",
};

export async function loadLetterhead(): Promise<Result<Letterhead>> {
  const r = await getSetting<Letterhead>("letterhead", DEFAULT_LETTERHEAD);
  return r.ok ? { ok: true, value: withDefaults(r.value) } : r;
}
export const saveLetterhead = (value: Letterhead): Promise<Result<true>> => saveSetting("letterhead", value, false);
export const loadInvoiceSettings = () => getSetting<InvoiceSettings>("payments.invoices", DEFAULT_INVOICE_SETTINGS);

/** How the next number of a kind will look, e.g. INV-MTL-001. */
export function numberExample(s: InvoiceSettings, kind: "invoice" | "receipt" | "letter", n = 1): string {
  const clean = (v: string, fallback: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") || fallback;
  const prefix = kind === "invoice" ? clean(s.invoice_prefix, "INV") : kind === "receipt" ? clean(s.receipt_prefix, "REC") : clean(s.letter_prefix, "LTR");
  return `${prefix}-${clean(s.code, "MTL")}-${n < 1000 ? String(n).padStart(3, "0") : n}`;
}
export const saveInvoiceSettings = (value: InvoiceSettings): Promise<Result<true>> => saveSetting("payments.invoices", value, false);

/** "@bymantel", "bymantel" or a full link all become the handle. */
export function instagramHandle(value: string): string {
  return value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?].*$/, "").replace(/^@/, "");
}

export function crLine(h: Letterhead): string {
  return h.cr_number.trim() ? `CR No.${h.cr_number.trim()}` : "";
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Draws any image as a PNG so Word can use it in place of the heart. */
async function logoAsPng(url: string): Promise<{ png: Blob; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return png ? { png, width: canvas.width, height: canvas.height } : null;
  } catch {
    return null;
  }
}

type Zip = import("jszip");

/** The Word letterhead filled with the saved details: header, footer, logo and styles. */
async function buildLetterhead(h: Letterhead): Promise<Zip> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await (await fetch(templateUrl)).arrayBuffer());
  const handle = instagramHandle(h.instagram);
  const tokens: Record<string, string> = {
    NAME: h.name.trim(),
    CR_LINE: crLine(h),
    ADDRESS: h.address.trim(),
    EMAIL_LABEL: h.email.trim() ? "EMAIL" : "",
    EMAIL: h.email.trim(),
    INSTAGRAM_LABEL: handle ? "INSTAGRAM" : "",
    INSTAGRAM: handle ? `@${handle}` : "",
    EMAIL_URL: h.email.trim() || "hello@bymantel.com",
    INSTAGRAM_URL: `https://www.instagram.com/${handle || "bymantel"}`,
  };
  const styleOf: Record<string, StyleKey> = {
    NAME: "name", CR_LINE: "details", ADDRESS: "details",
    EMAIL_LABEL: "labels", INSTAGRAM_LABEL: "labels", EMAIL: "values", INSTAGRAM: "values",
  };
  const restyle = (xml: string) => {
    let out = xml;
    for (const [token, key] of Object.entries(styleOf)) {
      const re = new RegExp(`<w:rPr>(?:(?!</w:rPr>)[\\s\\S])*</w:rPr>(<w:t(?: [^>]*)?>\\{\\{${token}\\}\\}</w:t>)`, "g");
      out = out.replace(re, (_, t: string) => wordRunProps(h.styles[key]) + t);
    }
    return out;
  };
  const fill = (xml: string) => restyle(xml).replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => xmlEscape(tokens[key] ?? ""));
  for (const path of ["word/document.xml", "word/_rels/document.xml.rels"]) {
    const file = zip.file(path);
    if (file) zip.file(path, fill(await file.async("string")));
  }

  // The logo keeps its right edge where the template has it and grows to the
  // chosen width (1 mm = 36000 EMU).
  let ratio = 1016 / 1200;
  if (h.logo_url && !isDefaultLogo(h.logo_url)) {
    const logo = await logoAsPng(h.logo_url);
    if (logo) {
      zip.file("word/media/image1.png", logo.png);
      ratio = logo.height / logo.width;
    }
  }
  const header = zip.file("word/header1.xml");
  if (header) {
    const cx = Math.round(Math.min(40, Math.max(4, h.logo_size)) * 36000);
    const cy = Math.round(cx * ratio);
    const rightEdge = 7190456 + 294695;
    const xml = (await header.async("string"))
      .replace(/(<wp:positionH relativeFrom="page"><wp:posOffset>)\d+(<\/wp:posOffset>)/, `$1${rightEdge - cx}$2`)
      .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${cx}" cy="${cy}"/>`)
      .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${cx}" cy="${cy}"/>`);
    zip.file("word/header1.xml", xml);
  }
  return zip;
}

async function saveZip(zip: Zip, filename: string) {
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fills the Word letterhead with the saved details and downloads it. */
export async function downloadLetterheadDocx(h: Letterhead): Promise<Result<true>> {
  try {
    await saveZip(await buildLetterhead(h), "Mantel-letterhead.docx");
    return { ok: true, value: true };
  } catch {
    return { ok: false, error: translate(currentLang(), "The Word file couldn't be made. Try again.") };
  }
}

/* ── Lists on the letterhead ─────────────────────────────────────────────── */

export type ExportColumn = {
  key: string;
  label: string;
  /** Relative width in the Word table. */
  weight?: number;
  align?: "left" | "right";
  /** Left out of the Word table (it is still in the spreadsheet). */
  wordless?: boolean;
};

export type ExportSection = { heading?: string; columns: ExportColumn[]; rows: Record<string, unknown>[] };

export type ExportSpec = { title: string; subtitle?: string; filename: string; sections: ExportSection[] };

const TEXT_WIDTH = 9670; // twips between the template's margins, less its 115 indent

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  return String(v);
}

function runs(text: string, rPr: string): string {
  const parts = text.split(/\r?\n/);
  return parts.map((p, i) => `${i ? "<w:r><w:br/></w:r>" : ""}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r>`).join("");
}

function para(text: string, rPr: string, { before = 0, after = 0, align = "left" }: { before?: number; after?: number; align?: string } = {}): string {
  return `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}"/><w:ind w:left="115"/>${align === "right" ? '<w:jc w:val="right"/>' : ""}</w:pPr>${runs(text, rPr)}</w:p>`;
}

function tableXml(h: Letterhead, section: ExportSection): string {
  const cols = section.columns.filter((c) => !c.wordless);
  const total = cols.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  const widths = cols.map((c) => Math.round((TEXT_WIDTH * (c.weight ?? 1)) / total));
  const small = cols.length > 5;
  const body = { ...h.styles.body, size: Math.max(7, h.styles.body.size - (small ? 2 : 1)) };
  const labelRpr = wordRunProps(h.styles.labels);
  const bodyRpr = wordRunProps(body);
  const cell = (text: string, width: number, rPr: string, align: string | undefined, border: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcBorders><w:bottom ${border}/></w:tcBorders></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/>${align === "right" ? '<w:jc w:val="right"/>' : ""}</w:pPr>${runs(text, rPr)}</w:p></w:tc>`;
  const headRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cols.map((c, i) => cell(c.label, widths[i]!, labelRpr, c.align, 'w:val="single" w:sz="8" w:space="0" w:color="171310"')).join("")}</w:tr>`;
  const rows = section.rows.map((r) =>
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cols.map((c, i) => cell(cellText(r[c.key]), widths[i]!, bodyRpr, c.align, 'w:val="single" w:sz="4" w:space="0" w:color="E8E4DC"')).join("")}</w:tr>`,
  ).join("");
  const none = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="nil"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/><w:tblInd w:w="115" w:type="dxa"/><w:tblBorders>${none}</w:tblBorders>` +
    `<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr>` +
    `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${headRow}${rows}</w:tbl>`;
}

/** Splits a body into its top-level paragraphs and tables. */
function topLevel(body: string): string[] {
  const out: string[] = [];
  const re = /<(\/?)w:(p|tbl)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    if (m[3]) continue;
    if (!m[1]) {
      if (depth === 0) start = m.index;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) out.push(body.slice(start, re.lastIndex));
    }
  }
  return out;
}

/**
 * A list (orders, customers, subscribers, sales…) as a Word document on the
 * café letterhead: the template's blank writing space is replaced with a
 * title and a table whose heading row repeats on every page.
 */
export async function downloadLetterheadTable(h: Letterhead, spec: ExportSpec): Promise<Result<true>> {
  try {
    const zip = await buildLetterhead(h);
    const file = zip.file("word/document.xml");
    if (!file) throw new Error("no document");
    const xml = await file.async("string");
    const open = xml.indexOf("<w:body>") + "<w:body>".length;
    const close = xml.lastIndexOf("<w:sectPr");
    const parts = topLevel(xml.slice(open, close));
    const breaks = parts.map((p, i) => (p.includes("<w:sectPr") ? i : -1)).filter((i) => i >= 0);
    if (breaks.length < 2) throw new Error("unexpected template");
    const [first, second] = [breaks[0]!, breaks[1]!];

    const titleRpr = wordRunProps({ ...h.styles.body, bold: true, size: h.styles.body.size + 5 });
    const mutedRpr = wordRunProps({ ...h.styles.body, color: "#766E66", size: Math.max(7, h.styles.body.size - 1) });
    const headingRpr = wordRunProps({ ...h.styles.body, bold: true, size: h.styles.body.size + 1 });
    const content = [
      para(spec.title, titleRpr, { before: 360, after: 40 }),
      spec.subtitle ? para(spec.subtitle, mutedRpr, { after: 120 }) : "",
      ...spec.sections.flatMap((section) => [
        section.heading ? para(section.heading, headingRpr, { before: 280, after: 80 }) : "",
        section.rows.length ? tableXml(h, section) : para("Nothing to show.", mutedRpr, { before: 120 }),
      ]),
      para(`Downloaded ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bahrain", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())}`, mutedRpr, { before: 240, after: 240 }),
    ].join("");

    const body = [...parts.slice(0, first + 1), content, ...parts.slice(second)].join("");
    zip.file("word/document.xml", xml.slice(0, open) + body + xml.slice(close));
    await saveZip(zip, spec.filename.endsWith(".docx") ? spec.filename : `${spec.filename}.docx`);
    return { ok: true, value: true };
  } catch {
    return { ok: false, error: translate(currentLang(), "The Word file couldn't be made. Try again.") };
  }
}
