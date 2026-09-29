import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { useT } from "@/admin/i18n";
import { downloadFile, toCsv } from "@/admin/lib/format";
import { downloadLetterheadTable, loadLetterhead, type ExportSpec, type Letterhead } from "@/admin/lib/letterhead";
import { downloadSheetPdf } from "@/admin/lib/pdf";
import { Button } from "@/admin/ui/controls";
import { ListSheet } from "@/admin/ui/ListSheet";
import { Modal, useToast } from "@/admin/ui/overlays";

/*
 * "Download" for any list in the dashboard, three ways:
 *
 *   PDF          the letterhead with the list on it, exactly as it looks
 *                here — the one to send, and the one a phone shows properly
 *   Word         the same on the café's Word letterhead, for editing
 *   Spreadsheet  CSV for Excel, Numbers or the accountant
 */
export function ExportButton({ spec, disabled, label }: { spec: () => ExportSpec | Promise<ExportSpec>; disabled?: boolean; label?: string }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /* The sheet for the PDF, drawn off screen while it's captured. */
  const [sheet, setSheet] = useState<{ head: Letterhead; spec: ExportSpec } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  /** The list itself may need loading (all orders, not just this page). */
  const getSpec = async (): Promise<ExportSpec | null> => {
    try {
      return await spec();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Something went wrong. Please try again."));
      return null;
    }
  };

  const withLetterhead = async (): Promise<{ head: Letterhead; spec: ExportSpec } | null> => {
    const [head, s] = await Promise.all([loadLetterhead(), getSpec()]);
    if (!s) return null;
    if (!head.ok) {
      toast.error(head.error);
      return null;
    }
    return { head: head.value, spec: s };
  };

  const pdf = async () => {
    setBusy(true);
    const job = await withLetterhead();
    if (!job) return setBusy(false);
    setSheet(job);
  };

  useEffect(() => {
    if (!sheet) return;
    const node = sheetRef.current?.querySelector<HTMLElement>(".mtl-sheet");
    if (!node) return;
    void downloadSheetPdf(node, sheet.spec.filename).then((r) => {
      setSheet(null);
      setBusy(false);
      if (!r.ok) return toast.error(t(r.error));
      setOpen(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const word = async () => {
    setBusy(true);
    const job = await withLetterhead();
    if (!job) return setBusy(false);
    const r = await downloadLetterheadTable(job.head, job.spec);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setOpen(false);
  };

  const csv = async () => {
    setBusy(true);
    const s = await getSpec();
    setBusy(false);
    if (!s) return;
    const blocks = s.sections.map((section) =>
      (section.heading ? `${section.heading}\r\n` : "") + toCsv(section.rows, section.columns.map((c) => ({ key: c.key, label: c.label }))),
    );
    downloadFile(`${s.filename}.csv`, blocks.join("\r\n\r\n"));
    setOpen(false);
  };

  return (
    <>
      <Button icon={<Download size={16} />} disabled={disabled} onClick={() => setOpen(true)}>{label ?? t("Download")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Download")}>
        <div className="adm-stack" style={{ gap: 10 }}>
          <button type="button" className="adm-choice" onClick={pdf} disabled={busy}>
            <FileType2 size={22} aria-hidden="true" />
            <span>
              <strong>{t("PDF on the letterhead")}</strong>
              <span>{t("Looks the same on every phone and computer. Best for sending.")}</span>
            </span>
          </button>
          <button type="button" className="adm-choice" onClick={word} disabled={busy}>
            <FileText size={22} aria-hidden="true" />
            <span>
              <strong>{t("Word document on the letterhead")}</strong>
              <span>{t("For changing it afterwards. Opens best in the Word app.")}</span>
            </span>
          </button>
          <button type="button" className="adm-choice" onClick={csv} disabled={busy}>
            <FileSpreadsheet size={22} aria-hidden="true" />
            <span>
              <strong>{t("Spreadsheet")}</strong>
              <span>{t("For Excel, Numbers or the accountant.")}</span>
            </span>
          </button>
          {busy && <p className="adm-small adm-muted">{t("Making the document…")}</p>}
        </div>
      </Modal>
      {sheet && createPortal(
        <div ref={sheetRef} className="adm-print-offscreen" aria-hidden="true">
          <ListSheet head={sheet.head} spec={sheet.spec} />
        </div>,
        document.body,
      )}
    </>
  );
}
