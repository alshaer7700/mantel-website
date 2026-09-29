import { useEffect, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, Copy, Download, FilePlus2, FileText, Plus, Printer, Receipt, Send, Trash2 } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync, useUnsavedGuard } from "@/admin/lib/useAsync";
import { bahrainToday, dateOnly, money } from "@/admin/lib/format";
import { db, rpc, run } from "@/admin/lib/db";
import {
  DEFAULT_INVOICE_SETTINGS,
  DEFAULT_LETTERHEAD,
  DEFAULT_LOGO,
  DEFAULT_STYLES,
  downloadLetterheadDocx,
  isDefaultLogo,
  instagramHandle,
  loadInvoiceSettings,
  loadLetterhead,
  numberExample,
  saveInvoiceSettings,
  saveLetterhead,
  type InvoiceSettings,
  type Letterhead,
  type StyleKey,
  type TextStyle,
} from "@/admin/lib/letterhead";
import { Button, Chips, IconButton, MoneyField, NumberField, SearchInput, SelectField, TextArea, TextField, Toggle } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, SaveBar, Stat, Tabs } from "@/admin/ui/layout";
import { Modal, useConfirm, useToast } from "@/admin/ui/overlays";
import { ImagePicker } from "@/admin/ui/ImagePicker";
import { TextStyleBar } from "@/admin/ui/TextStyleBar";
import { LetterheadSheet, PrintSheet, ScaledSheet } from "@/admin/ui/LetterheadSheet";
import { downloadSheetPdf } from "@/admin/lib/pdf";
import {
  InvoiceDocument,
  PAYMENT_LABEL,
  lineAmount,
  totalsFor,
  type BillTo,
  type DocKind,
  type Invoice,
  type InvoiceLine,
  type PaymentMethod,
} from "@/admin/sections/invoices/InvoiceDocument";

type Tab = "invoice" | "receipt" | "letter" | "letterhead" | "settings";

/** Where each list lives: /admin/invoices, /admin/invoices/receipts, … */
const ROUTE: Record<DocKind, string | null> = { invoice: null, receipt: "receipts", letter: "letters" };

/** Every sentence per kind, written out so each one can be translated. */
const COPY: Record<DocKind, {
  plural: string; add: string; draft: string; recipient: string; date: string; back: string; none: string; noneBody: string;
  issueTitle: string; issueBody: string; issue: string; issued: string; voidIt: string; voided: string; copy: string; search: string;
}> = {
  invoice: {
    plural: "Invoices", add: "New invoice", draft: "Draft invoice", recipient: "Bill to", date: "Invoice date", back: "All invoices",
    none: "No invoices yet", noneBody: "Make one from scratch, or open an order and choose “Make an invoice”.",
    issueTitle: "Issue this invoice?", issueBody: "It gets the next invoice number and can't be edited after that. If something is wrong later, you void it and make a new one.",
    issue: "Issue invoice", issued: "Invoice {number} issued", voidIt: "Void invoice", voided: "Invoice voided", copy: "Copy into a new invoice",
    search: "Search number or customer",
  },
  receipt: {
    plural: "Receipts", add: "New receipt", draft: "Draft receipt", recipient: "Received from", date: "Receipt date", back: "All receipts",
    none: "No receipts yet", noneBody: "Make one from scratch, from an order (“Make a receipt”), or from an invoice once it's paid.",
    issueTitle: "Issue this receipt?", issueBody: "It gets the next receipt number and can't be edited after that. If something is wrong later, you void it and make a new one.",
    issue: "Issue receipt", issued: "Receipt {number} issued", voidIt: "Void receipt", voided: "Receipt voided", copy: "Copy into a new receipt",
    search: "Search number or customer",
  },
  letter: {
    plural: "Letters", add: "New letter", draft: "Draft letter", recipient: "To", date: "Letter date", back: "All letters",
    none: "No letters yet", noneBody: "Write a letter on the café letterhead, then print it or save it as a PDF.",
    issueTitle: "Issue this letter?", issueBody: "It gets the next letter number and can't be edited after that. If something is wrong later, you void it and make a new one.",
    issue: "Issue letter", issued: "Letter {number} issued", voidIt: "Void letter", voided: "Letter voided", copy: "Copy into a new letter",
    search: "Search number, name or subject",
  },
};

const STATUS: Record<Invoice["status"], { label: string; tone: "neutral" | "ok" | "warn" | "danger" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  issued: { label: "Unpaid", tone: "warn" },
  paid: { label: "Paid", tone: "ok" },
  void: { label: "Void", tone: "danger" },
};

function statusOf(doc: Invoice): { label: string; tone: "neutral" | "ok" | "warn" | "danger" | "info" } {
  if (doc.kind !== "invoice" && doc.status === "issued") return { label: "Issued", tone: "ok" };
  if (doc.kind === "invoice" && doc.status === "issued" && doc.due_date && doc.due_date < bahrainToday()) return { label: "Overdue", tone: "danger" };
  return STATUS[doc.status];
}

const PAYMENTS: PaymentMethod[] = ["cash", "card", "transfer", "benefitpay", "other"];

const n = (v: unknown) => Number(v ?? 0);

function normalize(raw: Invoice): Invoice {
  return {
    ...raw,
    kind: raw.kind ?? "invoice",
    vat_rate: n(raw.vat_rate),
    subtotal: n(raw.subtotal),
    vat: n(raw.vat),
    total: n(raw.total),
    bill_to: raw.bill_to ?? {},
    subject: raw.subject ?? "",
    body: raw.body ?? "",
    reference: raw.reference ?? "",
    lines: (raw.lines ?? []).map((l) => ({ description: l.description ?? "", quantity: n(l.quantity), unit_price: n(l.unit_price) })),
  };
}

export function InvoicesSection() {
  const t = useT();
  const { rest, navigate, can } = useAdmin();
  const first = rest[0] ?? "";
  const newKind = first.startsWith("new-") ? (first.slice(4) as DocKind) : first === "new" ? "invoice" : null;
  if (newKind && newKind in COPY) return <DocumentEditor id="new" newKind={newKind} />;
  const tab: Tab = first === "receipts" ? "receipt" : first === "letters" ? "letter" : first === "letterhead" && can("settings") ? "letterhead" : first === "settings" ? "settings" : "invoice";
  const known = ["", "receipts", "letters", "letterhead", "settings"];
  if (!known.includes(first)) return <DocumentEditor id={first} newKind={null} />;
  const listKind = tab === "invoice" || tab === "receipt" || tab === "letter" ? tab : null;

  return (
    <>
      <PageHeader
        overline={t("01 — Paperwork")}
        title={t("Documents.")}
        subtitle={t("Invoices, receipts and letters on the café letterhead, and the letterhead itself.")}
        actions={listKind && <Button variant="primary" icon={<FilePlus2 size={16} />} onClick={() => navigate("invoices", `new-${listKind}`)}>{t(COPY[listKind].add)}</Button>}
      />
      <Tabs
        label={t("Document sections")}
        value={tab}
        onChange={(v) => navigate("invoices", v === "invoice" ? null : v === "receipt" ? "receipts" : v === "letter" ? "letters" : v)}
        tabs={[
          { value: "invoice" as Tab, label: t("Invoices") },
          { value: "receipt" as Tab, label: t("Receipts") },
          { value: "letter" as Tab, label: t("Letters") },
          ...(can("settings") ? [{ value: "letterhead" as Tab, label: t("Letterhead") }] : []),
          { value: "settings" as Tab, label: t("Settings") },
        ]}
      />
      {listKind ? <DocumentList key={listKind} kind={listKind} /> : tab === "letterhead" ? <LetterheadEditor /> : <InvoiceSettingsPanel />}
    </>
  );
}

/* ── List ───────────────────────────────────────────────────────────────── */

function DocumentList({ kind }: { kind: DocKind }) {
  const t = useT();
  const { navigate } = useAdmin();
  const copy = COPY[kind];
  const list = useAsync(() => run<Invoice[]>(db.from("documents").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(500)), [kind]);
  const [filter, setFilter] = useState<"all" | Invoice["status"]>("all");
  const [query, setQuery] = useState("");
  const rows = (list.data ?? []).map(normalize);
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => (filter === "all" || r.status === filter) && (!q || `${r.number ?? ""} ${r.bill_to.name ?? ""} ${r.bill_to.company ?? ""} ${r.subject}`.toLowerCase().includes(q)));
  const month = bahrainToday().slice(0, 7);
  const unpaid = rows.filter((r) => r.status === "issued");
  const paidThisMonth = rows.filter((r) => r.status === "paid" && (r.paid_at ?? "").slice(0, 7) === month);
  const receivedThisMonth = rows.filter((r) => r.status === "issued" && (r.issue_date ?? "").slice(0, 7) === month);
  const totalOf = (r: Invoice) => (r.status === "draft" ? totalsFor(r.lines, r.vat_rate).total : r.total);

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      {kind === "invoice" && (
        <div className="adm-grid-4">
          <Stat label={t("Waiting to be paid")} value={money(unpaid.reduce((s, r) => s + r.total, 0))} note={t("{n} invoices", { n: unpaid.length })} alert={unpaid.some((r) => r.due_date && r.due_date < bahrainToday())} />
          <Stat label={t("Paid this month")} value={money(paidThisMonth.reduce((s, r) => s + r.total, 0))} note={t("{n} invoices", { n: paidThisMonth.length })} />
          <Stat label={t("Drafts")} value={rows.filter((r) => r.status === "draft").length} />
        </div>
      )}
      {kind === "receipt" && (
        <div className="adm-grid-4">
          <Stat label={t("Received this month")} value={money(receivedThisMonth.reduce((s, r) => s + r.total, 0))} note={t("{n} receipts", { n: receivedThisMonth.length })} />
          <Stat label={t("Drafts")} value={rows.filter((r) => r.status === "draft").length} />
        </div>
      )}
      <div className="adm-spread">
        <Chips
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("All") },
            { value: "draft", label: t("Drafts") },
            { value: "issued", label: kind === "invoice" ? t("Unpaid") : t("Issued") },
            ...(kind === "invoice" ? [{ value: "paid" as const, label: t("Paid") }] : []),
            { value: "void", label: t("Void") },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder={t(copy.search)} />
      </div>
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <LoadError message={list.error} onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title={rows.length ? t("Nothing matches") : t(copy.none)}
          body={rows.length ? undefined : t(copy.noneBody)}
          action={<Button icon={<FilePlus2 size={16} />} onClick={() => navigate("invoices", `new-${kind}`)}>{t(copy.add)}</Button>}
        />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-cards adm-cards-invoices">
            <thead>
              <tr>
                <th>{t("Number")}</th>
                <th>{kind === "letter" ? t("To") : t("For")}</th>
                <th>{t("Date")}</th>
                <th className="adm-num">{kind === "letter" ? t("Subject") : t("Total")}</th>
                <th>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const st = statusOf(r);
                return (
                  <tr key={r.id} className="is-clickable" onClick={() => navigate("invoices", r.id)}>
                    <td className="adm-strong" dir="ltr" style={{ textAlign: "start" }}>{r.number ?? t("Draft")}</td>
                    <td>{r.bill_to.name || "—"}{r.bill_to.company ? <div className="adm-small adm-muted">{r.bill_to.company}</div> : null}</td>
                    <td>{r.issue_date ? dateOnly(`${r.issue_date}T12:00:00Z`) : dateOnly(r.created_at)}</td>
                    <td className={kind === "letter" ? "" : "adm-num"}>{kind === "letter" ? r.subject || "—" : money(totalOf(r))}</td>
                    <td><Badge tone={st.tone}>{t(st.label)}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Editor ─────────────────────────────────────────────────────────────── */

type Draft = {
  bill_to: BillTo;
  lines: InvoiceLine[];
  vat_rate: number;
  notes: string;
  issue_date: string;
  due_date: string;
  subject: string;
  body: string;
  payment_method: PaymentMethod;
  reference: string;
};

const EMPTY_LINE: InvoiceLine = { description: "", quantity: 1, unit_price: 0 };

function emptyDraft(kind: DocKind, s: InvoiceSettings): Draft {
  return {
    bill_to: {},
    lines: kind === "letter" ? [] : [{ ...EMPTY_LINE }],
    vat_rate: kind !== "letter" && s.vat_registered ? s.vat_rate : 0,
    notes: kind === "invoice" ? s.default_notes : "",
    issue_date: "",
    due_date: "",
    subject: "",
    body: "",
    payment_method: "cash",
    reference: "",
  };
}

function draftFrom(doc: Invoice): Draft {
  return {
    bill_to: doc.bill_to ?? {},
    lines: doc.kind === "letter" ? [] : doc.lines.length ? doc.lines : [{ ...EMPTY_LINE }],
    vat_rate: doc.vat_rate,
    notes: doc.notes ?? "",
    issue_date: doc.issue_date ?? "",
    due_date: doc.due_date ?? "",
    subject: doc.subject ?? "",
    body: doc.body ?? "",
    payment_method: doc.payment_method ?? "cash",
    reference: doc.reference ?? "",
  };
}

function DocumentEditor({ id, newKind }: { id: string; newKind: DocKind | null }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { navigate } = useAdmin();
  const isNew = id === "new";
  const head = useAsync(loadLetterhead, []);
  const settings = useAsync(loadInvoiceSettings, []);
  const docQ = useAsync(
    () => (isNew ? Promise.resolve({ ok: true as const, value: null }) : run<Invoice>(db.from("documents").select("*").eq("id", id).single())),
    [id],
  );
  const doc = docQ.data ? normalize(docQ.data) : null;
  const kind: DocKind = doc?.kind ?? newKind ?? "invoice";
  const copy = COPY[kind];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  useEffect(() => {
    if (isNew && settings.data && !draft) {
      const d = emptyDraft(kind, settings.data);
      setDraft(d);
      setSaved(JSON.stringify(d));
    }
  }, [isNew, settings.data, draft, kind]);

  useEffect(() => {
    if (doc) {
      const d = draftFrom(doc);
      setDraft(d);
      setSaved(JSON.stringify(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docQ.data]);

  const editable = isNew || doc?.status === "draft";
  const dirty = editable && draft !== null && JSON.stringify(draft) !== saved;
  useUnsavedGuard(dirty);

  if (head.loading || settings.loading || docQ.loading || !draft) return <Loading />;
  if (docQ.error) return <LoadError message={docQ.error} onRetry={docQ.reload} />;
  const h = head.data ?? DEFAULT_LETTERHEAD;
  const s = { ...DEFAULT_INVOICE_SETTINGS, ...(settings.data ?? {}) };

  const setBill = (key: keyof BillTo, value: string) => setDraft({ ...draft, bill_to: { ...draft.bill_to, [key]: value } });
  const setLine = (i: number, patch: Partial<InvoiceLine>) => setDraft({ ...draft, lines: draft.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const totals = totalsFor(draft.lines, draft.vat_rate);
  const listRoute = ROUTE[kind];

  const preview: Invoice = doc && !editable
    ? doc
    : {
        id: doc?.id ?? "new",
        kind,
        number: null,
        status: "draft",
        order_id: doc?.order_id ?? null,
        related_id: doc?.related_id ?? null,
        letterhead: null,
        settings: null,
        paid_at: null,
        void_reason: null,
        created_at: doc?.created_at ?? new Date().toISOString(),
        updated_at: doc?.updated_at ?? new Date().toISOString(),
        ...draft,
        issue_date: draft.issue_date || null,
        due_date: draft.due_date || null,
        ...totals,
      };

  const save = async (quiet = false): Promise<string | null> => {
    setBusy("save");
    const r = await rpc<string>("admin_save_document", { p_id: isNew ? null : id, p_kind: kind, p_data: { ...draft, order_id: doc?.order_id ?? null, related_id: doc?.related_id ?? null } });
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
      return null;
    }
    setSaved(JSON.stringify(draft));
    if (!quiet) toast.ok(t("Draft saved"));
    if (isNew) navigate("invoices", r.value);
    else await docQ.reload();
    return r.value;
  };

  const issue = async () => {
    if (!draft.bill_to.name?.trim()) return toast.error(t("Add who it is for before issuing it."));
    if (kind === "letter" && !draft.body.trim()) return toast.error(t("Write the letter before issuing it."));
    if (kind !== "letter" && !draft.lines.some((l) => l.description.trim())) return toast.error(t("Add at least one line before issuing it."));
    const ok = await confirm({ title: t(copy.issueTitle), body: t(copy.issueBody), confirmLabel: t(copy.issue) });
    if (!ok) return;
    const savedId = dirty || isNew ? await save(true) : id;
    if (!savedId) return;
    setBusy("issue");
    const r = await rpc<string>("admin_issue_document", { p_id: savedId });
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t(copy.issued, { number: r.value }));
    if (savedId !== id) navigate("invoices", savedId);
    else await docQ.reload();
  };

  const setStatus = async (status: "paid" | "issued" | "void", reason?: string) => {
    setBusy(status);
    const r = await rpc("admin_set_document_status", { p_id: id, p_status: status, p_reason: reason ?? null });
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.ok(status === "paid" ? t("Marked as paid") : status === "void" ? t(copy.voided) : t("Marked as unpaid"));
    await docQ.reload();
  };

  const remove = async () => {
    const ok = await confirm({ title: t("Delete this draft?"), confirmLabel: t("Delete draft"), danger: true });
    if (!ok) return;
    const r = await rpc("admin_delete_document", { p_id: id });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Draft deleted"));
    navigate("invoices", listRoute);
  };

  const duplicate = async () => {
    const r = await rpc<string>("admin_save_document", { p_id: null, p_kind: kind, p_data: { ...draft, issue_date: "", due_date: "" } });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Copied into a new draft"));
    navigate("invoices", r.value);
  };

  const makeReceipt = async () => {
    setBusy("receipt");
    const r = await rpc<string>("admin_receipt_from_invoice", { p_id: id });
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    navigate("invoices", r.value);
  };

  /* The print copy stays in the page (hidden on screen): Safari on iPhone
     takes its print snapshot after print() returns, so a copy added just for
     the call was gone by then and the whole dashboard printed instead. */
  const print = () => window.print();

  const downloadPdf = async () => {
    const sheet = document.querySelector<HTMLElement>(".mtl-print .mtl-sheet");
    if (!sheet) return;
    setPdfBusy(true);
    const r = await downloadSheetPdf(sheet, doc?.number ?? `${h.name.replace(/\.$/, "")}-${kind}-draft`);
    setPdfBusy(false);
    if (!r.ok) toast.error(t(r.error));
  };

  const emailLink = () => {
    const to = draft.bill_to.email?.trim();
    const what = kind === "invoice" ? "invoice" : kind === "receipt" ? "receipt" : "letter";
    const subject = kind === "letter" && draft.subject ? draft.subject : `${h.name.replace(/\.$/, "")} ${what} ${doc?.number ?? ""}`.trim();
    const body = `Hello ${draft.bill_to.name ?? ""},\n\nPlease find ${what} ${doc?.number ?? ""}${kind === "letter" ? "" : ` for ${money(doc?.total ?? totals.total)}`} attached.\n\n${h.name}`;
    window.location.href = `mailto:${to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const status = doc?.status ?? "draft";
  const subtitle =
    status === "draft" ? t("Fill it in, check the preview, then issue it to give it a number.")
      : status === "void" ? t("This document was voided.")
        : kind !== "invoice" ? t("Issued {date}", { date: dateOnly(doc?.issue_date ? `${doc.issue_date}T12:00:00Z` : null) })
          : status === "paid" ? t("Paid {date}", { date: dateOnly(doc?.paid_at) })
            : t("Issued. Waiting to be paid.");

  const recipientCard = (
    <Card title={t(copy.recipient)}>
      <div className="adm-form-grid">
        <TextField label={t("Name")} value={draft.bill_to.name ?? ""} onChange={(v) => setBill("name", v)} disabled={!editable} maxLength={120} />
        <TextField label={t("Company")} optional value={draft.bill_to.company ?? ""} onChange={(v) => setBill("company", v)} disabled={!editable} maxLength={120} />
        <TextField label={t("Email")} optional type="email" dir="ltr" value={draft.bill_to.email ?? ""} onChange={(v) => setBill("email", v)} disabled={!editable} maxLength={160} />
        <TextField label={t("Phone")} optional dir="ltr" value={draft.bill_to.phone ?? ""} onChange={(v) => setBill("phone", v)} disabled={!editable} maxLength={40} />
        <TextArea label={t("Address")} optional rows={2} value={draft.bill_to.address ?? ""} onChange={(v) => setBill("address", v)} disabled={!editable} maxLength={300} />
        {kind !== "letter" && <TextField label={t("Their VAT number")} optional dir="ltr" value={draft.bill_to.vat_number ?? ""} onChange={(v) => setBill("vat_number", v)} disabled={!editable} maxLength={40} />}
      </div>
    </Card>
  );

  const linesCard = (
    <Card title={kind === "receipt" ? t("What was paid for") : t("What it's for")}>
      <div className="adm-stack" style={{ gap: 10 }}>
        {draft.lines.map((l, i) => (
          <div key={i} className="adm-invoice-line">
            <TextField label={t("Description")} value={l.description} onChange={(v) => setLine(i, { description: v })} disabled={!editable} maxLength={300} placeholder={t("e.g. Coffee catering, 20 people")} />
            <NumberField label={t("Qty")} value={l.quantity} onChange={(v) => setLine(i, { quantity: v ?? 0 })} disabled={!editable} min={0} />
            <MoneyField label={t("Unit price")} value={l.unit_price} onChange={(v) => setLine(i, { unit_price: v ?? 0 })} disabled={!editable} />
            <span className="adm-invoice-amount adm-num">{money(lineAmount(l))}</span>
            {editable && (
              <IconButton label={t("Remove line")} onClick={() => setDraft({ ...draft, lines: draft.lines.length > 1 ? draft.lines.filter((_, k) => k !== i) : [{ ...EMPTY_LINE }] })}>
                <Trash2 size={16} />
              </IconButton>
            )}
          </div>
        ))}
        {editable && (
          <div><Button size="sm" icon={<Plus size={14} />} onClick={() => setDraft({ ...draft, lines: [...draft.lines, { ...EMPTY_LINE }] })}>{t("Add a line")}</Button></div>
        )}
        <div className="adm-invoice-totals">
          <span>{t("Subtotal")}</span><strong className="adm-num">{money(totals.subtotal)}</strong>
          {draft.vat_rate > 0 && <><span>{t("VAT {rate}%", { rate: draft.vat_rate })}</span><strong className="adm-num">{money(totals.vat)}</strong></>}
          <span>{kind === "receipt" ? t("Amount received") : t("Total")}</span><strong className="adm-num" style={{ fontSize: 20 }}>{money(totals.total)}</strong>
        </div>
      </div>
    </Card>
  );

  const vatToggle = (s.vat_registered || draft.vat_rate > 0) && (
    <Toggle
      label={t("Add VAT ({rate}%)", { rate: s.vat_rate })}
      description={s.vat_registered ? t("Shown as a tax invoice with your VAT number.") : t("Your VAT registration is off in Settings.")}
      checked={draft.vat_rate > 0}
      onChange={(v) => setDraft({ ...draft, vat_rate: v ? s.vat_rate : 0 })}
      disabled={!editable}
    />
  );

  return (
    <>
      <PageHeader
        overline={<button type="button" className="adm-link-back" onClick={() => navigate("invoices", listRoute)}><ArrowLeft size={14} className="adm-flip-rtl" /> {t(copy.back)}</button>}
        title={doc?.number ?? (isNew ? t(copy.add) : t(copy.draft))}
        subtitle={subtitle}
        actions={(
          <>
            <Button icon={<Download size={16} />} onClick={() => void downloadPdf()} loading={pdfBusy}>{t("Download PDF")}</Button>
            <Button icon={<Printer size={16} />} onClick={print}>{t("Print")}</Button>
            {status !== "draft" && draft.bill_to.email && <Button icon={<Send size={16} />} onClick={emailLink}>{t("Email")}</Button>}
            {status === "draft" && <Button variant="primary" icon={<CheckCircle2 size={16} />} onClick={issue} loading={busy === "issue"}>{t(copy.issue)}</Button>}
            {kind === "invoice" && status === "issued" && <Button variant="primary" icon={<CheckCircle2 size={16} />} onClick={() => setStatus("paid")} loading={busy === "paid"}>{t("Mark as paid")}</Button>}
          </>
        )}
      />

      <div className="adm-invoice-layout">
        <div className="adm-stack" style={{ gap: 16 }}>
          {status === "void" && <Notice tone="danger" title={t("Void")}>{doc?.void_reason || t("No reason given.")}</Notice>}
          {doc?.order_id && (
            <Notice title={t("Made from an order")} action={<Button size="sm" onClick={() => navigate("orders", doc.order_id!)}>{t("Open order")}</Button>} />
          )}
          {doc?.related_id && (
            <Notice title={t("Receipt for invoice {number}", { number: doc.reference || "" })} action={<Button size="sm" onClick={() => navigate("invoices", doc.related_id!)}>{t("Open invoice")}</Button>} />
          )}

          {recipientCard}

          {kind === "letter" ? (
            <Card title={t("The letter")}>
              <div className="adm-stack">
                <TextField label={t(copy.date)} type="date" value={draft.issue_date} onChange={(v) => setDraft({ ...draft, issue_date: v })} disabled={!editable} hint={editable ? t("Leave empty to use the day you issue it.") : undefined} />
                <TextField label={t("Subject")} optional value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} disabled={!editable} maxLength={200} placeholder={t("e.g. Catering for your event on 12 October")} />
                <TextArea label={t("Letter")} rows={14} value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} disabled={!editable} maxLength={20000} placeholder={t("Dear …,")} />
                <p className="adm-small adm-muted">{t("The sign-off (“{signoff} {signature}”) is added underneath. Change it in Settings.", { signoff: s.letter_signoff, signature: s.letter_signature })}</p>
              </div>
            </Card>
          ) : (
            <>
              {linesCard}
              <Card title={kind === "receipt" ? t("Payment") : t("Details")}>
                <div className="adm-stack">
                  {vatToggle}
                  {kind === "receipt" && (
                    <div className="adm-form-grid">
                      <SelectField label={t("Paid by")} disabled={!editable} value={draft.payment_method} onChange={(v) => setDraft({ ...draft, payment_method: v as PaymentMethod })} options={PAYMENTS.map((p) => ({ value: p, label: t(PAYMENT_LABEL[p]) }))} />
                      <TextField label={t("For")} optional value={draft.reference} onChange={(v) => setDraft({ ...draft, reference: v })} disabled={!editable} maxLength={100} placeholder={t("e.g. INV-MTL-004 or an order number")} dir="ltr" />
                    </div>
                  )}
                  <div className="adm-form-grid">
                    <TextField label={t(copy.date)} type="date" value={draft.issue_date} onChange={(v) => setDraft({ ...draft, issue_date: v })} disabled={!editable} hint={editable ? t("Leave empty to use the day you issue it.") : undefined} />
                    {kind === "invoice" && (
                      <TextField label={t("Due date")} type="date" value={draft.due_date} onChange={(v) => setDraft({ ...draft, due_date: v })} disabled={!editable} hint={editable ? t("Leave empty for {n} days after the invoice date.", { n: s.due_days }) : undefined} />
                    )}
                  </div>
                  <TextArea label={kind === "receipt" ? t("Notes on the receipt") : t("Notes on the invoice")} optional rows={3} value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} disabled={!editable} maxLength={2000} />
                </div>
              </Card>
            </>
          )}

          <div className="adm-row" style={{ flexWrap: "wrap" }}>
            {status === "draft" && !isNew && <Button variant="danger" icon={<Trash2 size={16} />} onClick={remove}>{t("Delete draft")}</Button>}
            {status !== "draft" && status !== "void" && <Button variant="danger" icon={<Ban size={16} />} onClick={() => setVoidOpen(true)}>{t(copy.voidIt)}</Button>}
            {kind === "invoice" && status === "paid" && <Button onClick={() => setStatus("issued")} loading={busy === "issued"}>{t("Mark as unpaid")}</Button>}
            {kind === "invoice" && (status === "issued" || status === "paid") && <Button icon={<Receipt size={16} />} onClick={makeReceipt} loading={busy === "receipt"}>{t("Make a receipt")}</Button>}
            {!isNew && <Button icon={<Copy size={16} />} onClick={duplicate}>{t(copy.copy)}</Button>}
          </div>
        </div>

        <div className="adm-invoice-preview">
          <p className="adm-overline" style={{ marginBottom: 8 }}>{t("Preview")}</p>
          <ScaledSheet><InvoiceDocument invoice={preview} head={h} settings={s} /></ScaledSheet>
        </div>
      </div>

      {editable && <SaveBar dirty={dirty} saving={busy === "save"} onSave={() => void save()} message={t("This draft has unsaved changes")} />}
      <PrintSheet><InvoiceDocument invoice={preview} head={h} settings={s} /></PrintSheet>
      <VoidModal open={voidOpen} onClose={() => setVoidOpen(false)} title={t(copy.voidIt)} onVoid={async (reason) => { setVoidOpen(false); await setStatus("void", reason); }} />
    </>
  );
}

function VoidModal({ open, onClose, onVoid, title }: { open: boolean; onClose: () => void; onVoid: (reason: string) => void; title: string }) {
  const t = useT();
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${title}?`}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="danger" onClick={() => onVoid(reason.trim())}>{title}</Button>
        </>
      )}
    >
      <div className="adm-stack">
        <p>{t("The number stays used and the document is kept, marked VOID. Make a new one if it's still needed.")}</p>
        <TextField label={t("Why")} optional value={reason} onChange={setReason} maxLength={300} placeholder={t("e.g. Wrong amount")} />
      </div>
    </Modal>
  );
}

/* ── Letterhead ─────────────────────────────────────────────────────────── */

function LetterheadEditor() {
  const t = useT();
  const toast = useToast();
  const loaded = useAsync(loadLetterhead, []);
  const [draft, setDraft] = useState<Letterhead | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (loaded.data) setDraft(loaded.data);
  }, [loaded.data]);

  const dirty = !!draft && !!loaded.data && JSON.stringify(draft) !== JSON.stringify(loaded.data);
  useUnsavedGuard(dirty);

  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <LoadError message={loaded.error} onRetry={loaded.reload} />;
  if (!draft) return null;

  const set = (key: "name" | "cr_number" | "address" | "logo_url" | "email" | "instagram", value: string) => setDraft({ ...draft, [key]: value });
  const setStyle = (key: StyleKey, value: TextStyle) => setDraft({ ...draft, styles: { ...draft.styles, [key]: value } });

  const save = async () => {
    const clean = { ...draft, instagram: instagramHandle(draft.instagram), name: draft.name.trim(), email: draft.email.trim() };
    setSaving(true);
    const r = await saveLetterhead(clean);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Letterhead saved. New invoices and order emails use it now."));
    await loaded.reload();
  };

  const download = async () => {
    setDownloading(true);
    const r = await downloadLetterheadDocx(draft);
    setDownloading(false);
    if (!r.ok) toast.error(r.error);
  };

  return (
    <div className="adm-invoice-layout">
      <div className="adm-stack" style={{ gap: 16 }}>
        <Notice title={t("One letterhead for everything")}>
          {t("What you set here appears on invoices, on the new-order emails and in the Word letterhead you can download. Invoices already issued keep the letterhead they were issued with.")}
        </Notice>
        <Card title={t("Top of the page")}>
          <div className="adm-stack" style={{ gap: 18 }}>
            <div className="adm-stack" style={{ gap: 6 }}>
              <TextField label={t("Name")} value={draft.name} onChange={(v) => set("name", v)} maxLength={40} />
              <TextStyleBar label={t("Name")} value={draft.styles.name} fallback={DEFAULT_STYLES.name} onChange={(v) => setStyle("name", v)} />
            </div>
            <div className="adm-stack" style={{ gap: 6 }}>
              <TextField label={t("CR number")} optional value={draft.cr_number} onChange={(v) => set("cr_number", v)} maxLength={40} dir="ltr" hint={t("Printed as “CR No.” followed by this.")} />
              <TextArea label={t("Address")} optional rows={2} value={draft.address} onChange={(v) => set("address", v)} maxLength={200} />
              <p className="adm-small adm-muted">{t("Look of the CR number and address")}</p>
              <TextStyleBar label={t("Company details")} value={draft.styles.details} fallback={DEFAULT_STYLES.details} onChange={(v) => setStyle("details", v)} />
            </div>
            <ImagePicker
              label={t("Logo")}
              value={draft.logo_url && !isDefaultLogo(draft.logo_url) ? draft.logo_url : null}
              onChange={(url) => set("logo_url", url ?? DEFAULT_LOGO)}
              folder="letterhead"
              fallback={DEFAULT_LOGO}
              hint={t("Shown small in the top corner. A square or wide image with a plain background works best.")}
            />
            <div className="adm-field">
              <label className="adm-label" htmlFor="logo-size">{t("Logo size")} · {draft.logo_size} mm</label>
              <input id="logo-size" className="adm-range" type="range" min={6} max={40} step={1} value={draft.logo_size} onChange={(e) => setDraft({ ...draft, logo_size: Number(e.target.value) })} />
            </div>
          </div>
        </Card>
        <Card title={t("Footer")} subtitle={t("Leave one empty to hide it.")}>
          <div className="adm-stack" style={{ gap: 18 }}>
            <TextField label={t("Email")} optional type="email" dir="ltr" value={draft.email} onChange={(v) => set("email", v)} maxLength={120} />
            <TextField label={t("Instagram")} optional dir="ltr" prefix="@" value={draft.instagram.replace(/^@/, "")} onChange={(v) => set("instagram", v)} maxLength={60} />
            <div className="adm-stack" style={{ gap: 6 }}>
              <p className="adm-small adm-muted">{t("Small labels (EMAIL, INSTAGRAM, and the headings on invoices)")}</p>
              <TextStyleBar label={t("Labels")} value={draft.styles.labels} fallback={DEFAULT_STYLES.labels} onChange={(v) => setStyle("labels", v)} />
            </div>
            <div className="adm-stack" style={{ gap: 6 }}>
              <p className="adm-small adm-muted">{t("The email address and Instagram name")}</p>
              <TextStyleBar label={t("Footer details")} value={draft.styles.values} fallback={DEFAULT_STYLES.values} onChange={(v) => setStyle("values", v)} />
            </div>
          </div>
        </Card>
        <Card title={t("Page text")} subtitle={t("The writing on invoices, under the letterhead.")}>
          <TextStyleBar label={t("Page text")} value={draft.styles.body} fallback={DEFAULT_STYLES.body} onChange={(v) => setStyle("body", v)} />
        </Card>
        <div className="adm-row" style={{ flexWrap: "wrap" }}>
          <Button icon={<Download size={16} />} onClick={download} loading={downloading}>{t("Download as Word")}</Button>
          <Button variant="ghost" onClick={() => setDraft({ ...draft, styles: DEFAULT_STYLES, logo_size: DEFAULT_LETTERHEAD.logo_size })}>{t("Reset the look")}</Button>
          <Button variant="ghost" onClick={() => setDraft({ ...DEFAULT_LETTERHEAD })}>{t("Reset to the original")}</Button>
        </div>
      </div>
      <div className="adm-invoice-preview">
        <p className="adm-overline" style={{ marginBottom: 8 }}>{t("Preview")}</p>
        <ScaledSheet>
          <LetterheadSheet head={{ ...draft, instagram: instagramHandle(draft.instagram) }}>
            <div className="mtl-label">{t("Sample")}</div>
            <p style={{ marginTop: "2mm", maxWidth: "140mm" }}>
              This is how the writing on invoices and letters will look. Change the page text above to see it here.
            </p>
          </LetterheadSheet>
        </ScaledSheet>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setDraft(loaded.data ?? null)} />
    </div>
  );
}

/* ── Invoice settings ───────────────────────────────────────────────────── */

function InvoiceSettingsPanel() {
  const t = useT();
  const toast = useToast();
  const loaded = useAsync(loadInvoiceSettings, []);
  const [draft, setDraft] = useState<InvoiceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (loaded.data) setDraft(loaded.data);
  }, [loaded.data]);
  const dirty = !!draft && !!loaded.data && JSON.stringify(draft) !== JSON.stringify(loaded.data);
  useUnsavedGuard(dirty);

  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <LoadError message={loaded.error} onRetry={loaded.reload} />;
  if (!draft) return null;

  const save = async () => {
    setSaving(true);
    const clean = (v: string, fallback: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") || fallback;
    const r = await saveInvoiceSettings({
      ...draft,
      code: clean(draft.code, "MTL"),
      invoice_prefix: clean(draft.invoice_prefix, "INV"),
      receipt_prefix: clean(draft.receipt_prefix, "REC"),
      letter_prefix: clean(draft.letter_prefix, "LTR"),
    });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Invoice settings saved"));
    await loaded.reload();
  };

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 720 }}>
      <Card title={t("Numbering")} subtitle={t("Each kind counts up on its own. Numbers never repeat or skip.")}>
        <div className="adm-stack">
          <TextField label={t("Middle part (all documents)")} value={draft.code} onChange={(v) => setDraft({ ...draft, code: v })} maxLength={8} dir="ltr" />
          <div className="adm-form-grid">
            <TextField label={t("Invoices start with")} value={draft.invoice_prefix} onChange={(v) => setDraft({ ...draft, invoice_prefix: v })} maxLength={8} dir="ltr" hint={numberExample(draft, "invoice")} />
            <TextField label={t("Receipts start with")} value={draft.receipt_prefix} onChange={(v) => setDraft({ ...draft, receipt_prefix: v })} maxLength={8} dir="ltr" hint={numberExample(draft, "receipt")} />
            <TextField label={t("Letters start with")} value={draft.letter_prefix} onChange={(v) => setDraft({ ...draft, letter_prefix: v })} maxLength={8} dir="ltr" hint={numberExample(draft, "letter")} />
          </div>
        </div>
      </Card>
      <Card title={t("VAT")}>
        <div className="adm-stack">
          <Toggle
            label={t("The café is registered for VAT")}
            description={t("Invoices can then add VAT, show your VAT number and say “Tax invoice”.")}
            checked={draft.vat_registered}
            onChange={(v) => setDraft({ ...draft, vat_registered: v })}
          />
          {draft.vat_registered && (
            <div className="adm-form-grid">
              <TextField label={t("VAT number")} value={draft.vat_number} onChange={(v) => setDraft({ ...draft, vat_number: v })} maxLength={40} dir="ltr" />
              <NumberField label={t("VAT rate")} value={draft.vat_rate} onChange={(v) => setDraft({ ...draft, vat_rate: Math.min(100, Math.max(0, v ?? 0)) })} prefix="%" min={0} max={100} />
            </div>
          )}
        </div>
      </Card>
      <Card title={t("Payment")}>
        <div className="adm-stack">
          <NumberField label={t("Days to pay")} value={draft.due_days} onChange={(v) => setDraft({ ...draft, due_days: Math.max(0, Math.round(v ?? 0)) })} min={0} hint={t("Used for the due date when you don't pick one.")} />
          <TextArea label={t("Payment details")} optional rows={4} value={draft.bank_details} onChange={(v) => setDraft({ ...draft, bank_details: v })} maxLength={600} placeholder={t("e.g. Bank, account name, IBAN, BenefitPay number")} hint={t("Printed at the bottom of every invoice.")} />
          <TextArea label={t("Default note")} optional rows={2} value={draft.default_notes} onChange={(v) => setDraft({ ...draft, default_notes: v })} maxLength={600} hint={t("Filled in on new invoices. You can change it on each one.")} />
        </div>
      </Card>
      <Card title={t("Letters")}>
        <div className="adm-stack">
          <TextField label={t("Sign-off")} value={draft.letter_signoff} onChange={(v) => setDraft({ ...draft, letter_signoff: v })} maxLength={80} placeholder={t("e.g. Kind regards,")} />
          <TextArea label={t("Signed")} rows={2} value={draft.letter_signature} onChange={(v) => setDraft({ ...draft, letter_signature: v })} maxLength={200} hint={t("A name, or a name and a role on the next line.")} />
        </div>
      </Card>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setDraft(loaded.data ?? null)} />
    </div>
  );
}
