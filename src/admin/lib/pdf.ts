import type { Result } from "@/admin/lib/db";

/*
 * A PDF of a letterhead sheet, made in the browser.
 *
 * "Print or save as PDF" depends on the browser: Safari on a phone stamps the
 * page address and the date on every page, and some browsers print the page
 * behind. This takes the A4 sheet itself — the same one that prints — draws
 * it at print resolution and saves it as a PDF, so what you get is exactly
 * the letterhead and nothing else.
 *
 * The sheet is copied into a hidden spot on the page at full A4 size (the
 * on-screen preview is scaled down), captured, and removed. A sheet longer
 * than one page is cut into A4 pages.
 */

const A4_W_MM = 210;
const A4_H_MM = 297;

async function imagesReady(root: HTMLElement) {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) =>
      img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  );
}

export async function downloadSheetPdf(sheet: HTMLElement, filename: string): Promise<Result<true>> {
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;pointer-events:none;";
  const copy = sheet.cloneNode(true) as HTMLElement;
  /* The capture places text piece by piece; EB Garamond's ligatures and
     kerning then leave stray gaps ("Sara  A."). Plain spacing reads right. */
  copy.style.fontVariantLigatures = "none";
  copy.style.fontKerning = "none";
  copy.style.fontFeatureSettings = '"liga" 0, "clig" 0, "calt" 0, "kern" 0';
  holder.appendChild(copy);
  document.body.appendChild(holder);
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
    await document.fonts?.ready;
    await imagesReady(copy);

    const canvas = await html2canvas(copy, { scale: 3, backgroundColor: "#FFFFFF", useCORS: true, logging: false });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

    /* Pixels per millimetre of the capture; one A4 page is this many pixels tall. */
    const pxPerMm = canvas.width / A4_W_MM;
    const pageH = Math.round(A4_H_MM * pxPerMm);
    const pages = Math.max(1, Math.ceil((canvas.height - 2) / pageH));

    for (let i = 0; i < pages; i++) {
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(pageH, canvas.height - i * pageH);
      const ctx = slice.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, -i * pageH);
      if (i > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W_MM, slice.height / pxPerMm);
    }

    pdf.save(`${filename}.pdf`);
    return { ok: true, value: true };
  } catch {
    return { ok: false, error: "Couldn't make the PDF. Try “Print” instead." };
  } finally {
    holder.remove();
  }
}
