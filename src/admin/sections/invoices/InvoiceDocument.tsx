import type { InvoiceSettings, Letterhead } from "@/admin/lib/letterhead";
import { LetterheadSheet } from "@/admin/ui/LetterheadSheet";

export type BillTo = { name?: string; company?: string; address?: string; email?: string; phone?: string; vat_number?: string };
export type InvoiceLine = { description: string; quantity: number; unit_price: number };

export type Invoice = {
  id: string;
  number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  issue_date: string | null;
  due_date: string | null;
  order_id: string | null;
  bill_to: BillTo;
  lines: InvoiceLine[];
  vat_rate: number;
  subtotal: number;
  vat: number;
  total: number;
  notes: string;
  letterhead: Letterhead | null;
  settings: InvoiceSettings | null;
  paid_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
};

const bd = (n: number) => `BD ${(Number.isFinite(n) ? n : 0).toFixed(3)}`;

function longDate(d: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
}

export function lineAmount(l: InvoiceLine): number {
  return Math.round(Number(l.quantity || 0) * Number(l.unit_price || 0) * 1000) / 1000;
}

export function totalsFor(lines: InvoiceLine[], rate: number) {
  const subtotal = Math.round(lines.reduce((s, l) => s + lineAmount(l), 0) * 1000) / 1000;
  const vat = Math.round(subtotal * rate * 10) / 1000;
  return { subtotal, vat, total: Math.round((subtotal + vat) * 1000) / 1000 };
}

/*
 * The invoice itself, always in English on the café letterhead. An issued
 * invoice prints with the letterhead and settings frozen when it was issued;
 * a draft uses today's.
 */
export function InvoiceDocument({ invoice, head, settings }: { invoice: Invoice; head: Letterhead; settings: InvoiceSettings }) {
  const h = invoice.letterhead ?? head;
  const s = invoice.settings ?? settings;
  const lines = invoice.lines.filter((l) => l.description.trim());
  const { subtotal, vat, total } = invoice.status === "draft" ? totalsFor(lines, invoice.vat_rate) : { subtotal: Number(invoice.subtotal), vat: Number(invoice.vat), total: Number(invoice.total) };
  const taxInvoice = Number(invoice.vat_rate) > 0 && s.vat_registered;
  const b = invoice.bill_to ?? {};
  const watermark = invoice.status === "draft" ? "DRAFT" : invoice.status === "void" ? "VOID" : invoice.status === "paid" ? "PAID" : undefined;

  return (
    <LetterheadSheet head={h} extraLine={s.vat_registered && s.vat_number ? `VAT No.${s.vat_number}` : undefined} watermark={watermark}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", alignItems: "flex-start" }}>
        <div>
          <div className="mtl-label">{taxInvoice ? "Tax invoice" : "Invoice"}</div>
          <div className="mtl-mono" style={{ fontSize: "20pt", fontWeight: 500, lineHeight: 1.1, marginTop: "1.5mm" }}>{invoice.number ?? "Draft"}</div>
        </div>
        <table style={{ borderCollapse: "collapse", fontSize: "9.5pt" }}>
          <tbody>
            <tr>
              <td className="mtl-label" style={{ padding: "0.6mm 4mm 0.6mm 0" }}>Date</td>
              <td style={{ textAlign: "right" }}>{longDate(invoice.issue_date)}</td>
            </tr>
            <tr>
              <td className="mtl-label" style={{ padding: "0.6mm 4mm 0.6mm 0" }}>Due</td>
              <td style={{ textAlign: "right" }}>{invoice.status === "paid" ? "Paid" : longDate(invoice.due_date)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "9mm" }}>
        <div className="mtl-label">Bill to</div>
        <div style={{ marginTop: "1.5mm", fontSize: "12pt", fontWeight: 600 }}>{b.name || "—"}</div>
        {b.company && <div>{b.company}</div>}
        {b.address && <div style={{ whiteSpace: "pre-line" }}>{b.address}</div>}
        {(b.email || b.phone) && <div style={{ color: "#3A342D" }}>{[b.email, b.phone].filter(Boolean).join(" · ")}</div>}
        {b.vat_number && <div style={{ color: "#3A342D" }}>VAT No. {b.vat_number}</div>}
      </div>

      <table className="mtl-table" style={{ marginTop: "9mm" }}>
        <thead>
          <tr>
            <th style={{ width: "58%" }}>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr><td colSpan={4} style={{ color: "#766E66" }}>No lines yet</td></tr>
          ) : lines.map((l, i) => (
            <tr key={i}>
              <td>{l.description}</td>
              <td className="num">{Number(l.quantity)}</td>
              <td className="num">{bd(Number(l.unit_price))}</td>
              <td className="num">{bd(lineAmount(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ marginLeft: "auto", marginTop: "5mm", borderCollapse: "collapse", minWidth: "70mm" }}>
        <tbody>
          <tr>
            <td className="mtl-label" style={{ padding: "1mm 6mm 1mm 0" }}>Subtotal</td>
            <td className="mtl-mono" style={{ textAlign: "right", fontSize: "9pt" }}>{bd(subtotal)}</td>
          </tr>
          {Number(invoice.vat_rate) > 0 && (
            <tr>
              <td className="mtl-label" style={{ padding: "1mm 6mm 1mm 0" }}>VAT {Number(invoice.vat_rate)}%</td>
              <td className="mtl-mono" style={{ textAlign: "right", fontSize: "9pt" }}>{bd(vat)}</td>
            </tr>
          )}
          <tr>
            <td className="mtl-label" style={{ padding: "2.5mm 6mm 0 0", borderTop: "0.3mm solid #171310", color: "#171310" }}>Total</td>
            <td className="mtl-mono" style={{ textAlign: "right", fontSize: "12pt", fontWeight: 500, paddingTop: "2.5mm", borderTop: "0.3mm solid #171310" }}>{bd(total)}</td>
          </tr>
        </tbody>
      </table>

      {(invoice.notes || s.bank_details) && (
        <div style={{ display: "flex", gap: "10mm", marginTop: "12mm" }}>
          {invoice.notes && (
            <div style={{ flex: 1 }}>
              <div className="mtl-label">Notes</div>
              <div style={{ marginTop: "1.5mm", whiteSpace: "pre-line" }}>{invoice.notes}</div>
            </div>
          )}
          {s.bank_details && (
            <div style={{ flex: 1 }}>
              <div className="mtl-label">Payment details</div>
              <div style={{ marginTop: "1.5mm", whiteSpace: "pre-line" }}>{s.bank_details}</div>
            </div>
          )}
        </div>
      )}
      {invoice.status === "void" && invoice.void_reason && (
        <div style={{ marginTop: "8mm", color: "#9A1C1F" }}>Voided: {invoice.void_reason}</div>
      )}
    </LetterheadSheet>
  );
}
