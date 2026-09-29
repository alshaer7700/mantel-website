import templateUrl from "@/admin/assets/letterhead-template.docx?url";
import { getSetting, saveSetting, type Result } from "@/admin/lib/db";
import { currentLang, translate } from "@/admin/i18n";

/*
 * The café letterhead, edited on the Letterhead tab and used by the Word
 * download, invoices and the new-order email (order-notify reads the same
 * 'letterhead' setting).
 */
export type Letterhead = {
  name: string;
  cr_number: string;
  address: string;
  logo_url: string;
  email: string;
  instagram: string;
};

export const DEFAULT_LOGO = "https://bymantel.com/heart.webp";

export const DEFAULT_LETTERHEAD: Letterhead = {
  name: "MANTEL.",
  cr_number: "197765-1",
  address: "SHOP 114D, BLDG 114, ROAD 16, BLOCK 111, HIDD, KINGDOM OF BAHRAIN",
  logo_url: DEFAULT_LOGO,
  email: "hello@bymantel.com",
  instagram: "bymantel",
};

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

export const loadLetterhead = () => getSetting<Letterhead>("letterhead", DEFAULT_LETTERHEAD);
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
    const fill = (xml: string) => xml.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => xmlEscape(tokens[key] ?? ""));
    for (const path of ["word/document.xml", "word/_rels/document.xml.rels"]) {
      const file = zip.file(path);
      if (file) zip.file(path, fill(await file.async("string")));
    }

    if (h.logo_url && h.logo_url !== DEFAULT_LOGO) {
      const logo = await logoAsPng(h.logo_url);
      if (logo) {
        zip.file("word/media/image1.png", logo.png);
        const header = zip.file("word/header1.xml");
        if (header) {
          const cx = 294695;
          const cy = Math.round((cx * logo.height) / logo.width);
          const xml = (await header.async("string"))
            .replace(/(<wp:extent cx="\d+" cy=")\d+(")/, `$1${cy}$2`)
            .replace(/(<a:ext cx="\d+" cy=")\d+(")/, `$1${cy}$2`);
          zip.file("word/header1.xml", xml);
        }
      }
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
