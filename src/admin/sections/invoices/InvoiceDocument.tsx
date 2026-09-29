import type { InvoiceSettings, Letterhead } from "@/admin/lib/letterhead";
import { LetterheadSheet } from "@/admin/ui/LetterheadSheet";

export type DocKind = "invoice" | "receipt" | "letter";
export type BillTo = { name?: string; company?: string; address?: string; email?: string; phone?: string; vat_number?: string };
export type InvoiceLine = { description: string; quantity: number; unit_price: number };
export type PaymentMethod = "cash" | "card" | "transfer" | "benefitpay" | "other";

export type Invoice = {
  id: string;
  kind: DocKind;
  number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  issue_date: string | null;
  due_date: string | null;
  order_id: string | null;
  related_id: string | null;
  bill_to: BillTo;
  lines: InvoiceLine[];
  vat_rate: number;
  subtotal: number;
  vat: number;
  total: number;
  notes: string;
  subject: string;
  body: string;
  payment_method: PaymentMethod | null;
  reference: string;
  letterhead: Letterhead | null;
  settings: InvoiceSettings | null;
  paid_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
};

/** Printed on the document itself, which is always in English. */
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  transfer: "Bank transfer",
  benefitpay: "BenefitPay",
  other: "Other",
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

function Recipient({ label, b }: { label: string; b: BillTo }) {
  return (
    <div>
      <div className="mtl-label">{label}</div>
      <div style={{ marginTop: "1.5mm", fontSize: "12pt", fontWeight: 600 }}>{b.name || "—"}</div>
      {b.company && <div>{b.company}</div>}
      {b.address && <div style={{ whiteSpace: "pre-line" }}>{b.address}</div>}
      {(b.email || b.phone) && <div style={{ opacity: 0.85 }}>{[b.email, b.phone].filter(Boolean).join(" · ")}</div>}
      {b.vat_number && <div style={{ opacity: 0.85 }}>VAT No. {b.vat_number}</div>}
    </div>
  );
}

function Lines({ lines, vatRate, subtotal, vat, total, totalLabel }: { lines: InvoiceLine[]; vatRate: number; subtotal: number; vat: number; total: number; totalLabel: string }) {
  return (
    <>
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
            <tr><td colSpan={4} style={{ opacity: 0.6 }}>No lines yet</td></tr>
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
          {vatRate > 0 && (
            <tr>
              <td className="mtl-label" style={{ padding: "1mm 6mm 1mm 0" }}>VAT {vatRate}%</td>
              <td className="mtl-mono" style={{ textAlign: "right", fontSize: "9pt" }}>{bd(vat)}</td>
            </tr>
          )}
          <tr>
            <td className="mtl-label" style={{ padding: "2.5mm 6mm 0 0", borderTop: "0.3mm solid #171310", color: "#171310" }}>{totalLabel}</td>
            <td className="mtl-mono" style={{ textAlign: "right", fontSize: "12pt", fontWeight: 500, paddingTop: "2.5mm", borderTop: "0.3mm solid #171310" }}>{bd(total)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function DateBlock({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ borderCollapse: "collapse", fontSize: "9.5pt" }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="mtl-label" style={{ padding: "0.6mm 4mm 0.6mm 0" }}>{k}</td>
            <td style={{ textAlign: "right" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/*
 * An invoice, receipt or letter on the café letterhead, always in English.
 * Issued documents print with the letterhead and settings frozen when they
 * were issued; drafts use today's.
 */
export function InvoiceDocument({ invoice, head, settings }: { invoice: Invoice; head: Letterhead; settings: InvoiceSettings }) {
  const h = invoice.letterhead ?? head;
  const s = { ...settings, ...(invoice.settings ?? {}) };
  const kind = invoice.kind ?? "invoice";
  const lines = invoice.lines.filter((l) => l.description.trim());
  const totals = invoice.status === "draft" ? totalsFor(lines, invoice.vat_rate) : { subtotal: Number(invoice.subtotal), vat: Number(invoice.vat), total: Number(invoice.total) };
  const taxInvoice = Number(invoice.vat_rate) > 0 && s.vat_registered;
  const b = invoice.bill_to ?? {};
  const watermark = invoice.status === "draft" ? "DRAFT" : invoice.status === "void" ? "VOID" : kind === "invoice" && invoice.status === "paid" ? "PAID" : undefined;
  const title = kind === "letter" ? "Letter" : kind === "receipt" ? (taxInvoice ? "Tax receipt" : "Receipt") : taxInvoice ? "Tax invoice" : "Invoice";

  const topRow = (rows: [string, string][]) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", alignItems: "flex-start" }}>
      <div>
        <div className="mtl-label">{title}</div>
        <div className="mtl-mono" style={{ fontSize: "20pt", fontWeight: 500, lineHeight: 1.1, marginTop: "1.5mm" }}>{invoice.number ?? "Draft"}</div>
      </div>
      <DateBlock rows={rows} />
    </div>
  );

  return (
    <LetterheadSheet head={h} extraLine={s.vat_registered && s.vat_number && kind !== "letter" ? `VAT No.${s.vat_number}` : undefined} watermark={watermark}>
      {kind === "letter" ? (
        <>
          {topRow([["Date", longDate(invoice.issue_date)]])}
          <div style={{ marginTop: "9mm" }}><Recipient label="To" b={b} /></div>
          {invoice.subject && <div style={{ marginTop: "9mm", fontWeight: 700 }}>{invoice.subject}</div>}
          <div style={{ marginTop: "5mm", whiteSpace: "pre-line", maxWidth: "165mm" }}>{invoice.body || " "}</div>
          <div style={{ marginTop: "10mm", whiteSpace: "pre-line" }}>{s.letter_signoff}</div>
          <div style={{ marginTop: "12mm", fontWeight: 600, whiteSpace: "pre-line" }}>{s.letter_signature}</div>
        </>
      ) : kind === "receipt" ? (
        <>
          {topRow([
            ["Date", longDate(invoice.issue_date)],
            ["Paid by", invoice.payment_method ? PAYMENT_LABEL[invoice.payment_method] : "—"],
            ...(invoice.reference ? [["For", invoice.reference] as [string, string]] : []),
          ])}
          <div style={{ marginTop: "9mm" }}><Recipient label="Received from" b={b} /></div>
          <Lines lines={lines} vatRate={Number(invoice.vat_rate)} {...totals} totalLabel="Amount received" />
          {invoice.notes && (
            <div style={{ marginTop: "12mm" }}>
              <div className="mtl-label">Notes</div>
              <div style={{ marginTop: "1.5mm", whiteSpace: "pre-line" }}>{invoice.notes}</div>
            </div>
          )}
          <div style={{ marginTop: "10mm" }}>Received with thanks.</div>
        </>
      ) : (
        <>
          {topRow([
            ["Date", longDate(invoice.issue_date)],
            ["Due", invoice.status === "paid" ? "Paid" : longDate(invoice.due_date)],
          ])}
          <div style={{ marginTop: "9mm" }}><Recipient label="Bill to" b={b} /></div>
          <Lines lines={lines} vatRate={Number(invoice.vat_rate)} {...totals} totalLabel="Total" />
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
        </>
      )}
      {invoice.status === "void" && invoice.void_reason && (
        <div style={{ marginTop: "8mm", color: "#9A1C1F" }}>Voided: {invoice.void_reason}</div>
      )}
    </LetterheadSheet>
  );
}
