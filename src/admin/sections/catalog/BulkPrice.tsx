import { useMemo, useState } from "react";
import { useT } from "@/admin/i18n";
import { money } from "@/admin/lib/format";
import { Button, NumberField, SelectField } from "@/admin/ui/controls";
import { Notice } from "@/admin/ui/layout";
import { Modal, useToast } from "@/admin/ui/overlays";
import { bulkPrice, type Category } from "@/admin/sections/catalog/api";

type Priced = { id: string; name: string; price: number; category?: string; archived_at: string | null };

/** Mirrors admin_bulk_price() so the preview matches what the database will do. */
function newPrice(price: number, percent: number, roundTo: number): number {
  const r = Math.max(roundTo, 0.001);
  return Math.max(Math.round((price * (1 + percent / 100)) / r) * r, 0);
}

export function BulkPriceModal({ open, onClose, kind, items, categories, onDone }: { open: boolean; onClose: () => void; kind: "menu" | "object"; items: Priced[]; categories?: Category[]; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [percent, setPercent] = useState<number | null>(5);
  const [roundTo, setRoundTo] = useState("0.05");
  const [busy, setBusy] = useState(false);

  const affected = useMemo(
    () => items.filter((i) => !i.archived_at && i.price > 0 && (!category || i.category === category)),
    [items, category],
  );

  const apply = async () => {
    if (percent === null || percent === 0) return;
    setBusy(true);
    const r = await bulkPrice(kind, category || null, percent, Number(roundTo));
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("{n} prices updated", { n: r.value }));
    onDone();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Change prices")}
      wide
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" loading={busy} disabled={!percent || affected.length === 0} onClick={apply}>{t("Update {n} prices", { n: affected.length })}</Button></>}
    >
      <p>{t("Raise or lower many prices at once. Use a minus sign to lower them, for example -10.")}</p>
      <div className="adm-form-grid">
        {categories && (
          <SelectField
            label={t("Which items")}
            value={category}
            onChange={setCategory}
            options={[{ value: "", label: t("The whole menu") }, ...categories.map((c) => ({ value: c.slug, label: c.label }))]}
          />
        )}
        <NumberField label={t("Change by (%)")} value={percent} onChange={setPercent} min={-90} max={300} />
        <SelectField
          label={t("Round to")}
          value={roundTo}
          onChange={setRoundTo}
          options={[
            { value: "0.05", label: t("Nearest 50 fils (BD 1.550)") },
            { value: "0.1", label: t("Nearest 100 fils (BD 1.600)") },
            { value: "0.25", label: t("Nearest 250 fils (BD 1.750)") },
            { value: "0.001", label: t("No rounding") },
          ]}
        />
      </div>
      {percent ? (
        <div className="adm-table-wrap" style={{ maxHeight: 320, overflow: "auto" }}>
          <table className="adm-table">
            <thead><tr><th>{t("Item")}</th><th>{t("Now")}</th><th>{t("New price")}</th></tr></thead>
            <tbody>
              {affected.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className="adm-num adm-muted">{money(i.price)}</td>
                  <td className="adm-num adm-strong">{money(newPrice(i.price, percent, Number(roundTo)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Notice>{t("Enter a percentage to see the new prices before anything changes.")}</Notice>
      )}
    </Modal>
  );
}
