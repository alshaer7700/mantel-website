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

export const DEFAULT_LOGO = "https://bymantel.com/heart.webp";

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
  return { ...DEFAULT_LETTERHEAD, ...r, logo_size: Number(r.logo_size) || DEFAULT_LETTERHEAD.logo_size, styles };
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
  prefix: string;
  vat_registered: boolean;
  vat_number: string;
  vat_rate: number;
  due_days: number;
  bank_details: string;
  default_notes: string;
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  prefix: "INV",
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

/** Fills the Word letterhead with the saved details and downloads it. */
export async function downloadLetterheadDocx(h: Letterhead): Promise<Result<true>> {
  try {
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
    let ratio = 218981 / 294695;
    if (h.logo_url && h.logo_url !== DEFAULT_LOGO) {
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

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mantel-letterhead.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, value: true };
  } catch {
    return { ok: false, error: translate(currentLang(), "The Word file couldn't be made. Try again.") };
  }
}
