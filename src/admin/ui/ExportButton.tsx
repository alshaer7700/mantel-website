import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useT } from "@/admin/i18n";
import { downloadFile, toCsv } from "@/admin/lib/format";
import { downloadLetterheadTable, loadLetterhead, type ExportSpec } from "@/admin/lib/letterhead";
import { Button } from "@/admin/ui/controls";
import { Modal, useToast } from "@/admin/ui/overlays";

/*
 * "Download" for any list in the dashboard. The Word document is the café
 * letterhead with the list in a table — what opens nicely on a phone and
 * prints well. The spreadsheet (CSV) is for Excel, Numbers or the accountant.
 */
export function ExportButton({ spec, disabled, label }: { spec: () => ExportSpec | Promise<ExportSpec>; disabled?: boolean; label?: string }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /** The list itself may need loading (all orders, not just this page). */
  const getSpec = async (): Promise<ExportSpec | null> => {
    try {
      return await spec();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Something went wrong. Please try again."));
      return null;
    }
  };

  const word = async () => {
    setBusy(true);
    const [head, s] = await Promise.all([loadLetterhead(), getSpec()]);
    if (!s) return setBusy(false);
    if (!head.ok) {
      setBusy(false);
      return toast.error(head.error);
    }
    const r = await downloadLetterheadTable(head.value, s);
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
          <button type="button" className="adm-choice" onClick={word} disabled={busy}>
            <FileText size={22} aria-hidden="true" />
            <span>
              <strong>{t("Word document on the letterhead")}</strong>
              <span>{t("Opens on a phone, looks right when printed or sent.")}</span>
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
    </>
  );
}
