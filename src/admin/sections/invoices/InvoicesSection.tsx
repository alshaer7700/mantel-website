import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, Copy, Download, FilePlus2, FileText, Plus, Printer, Send, Trash2 } from "lucide-react";
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
  instagramHandle,
  loadInvoiceSettings,
  loadLetterhead,
  saveInvoiceSettings,
  saveLetterhead,
  type InvoiceSettings,
  type Letterhead,
  type StyleKey,
  type TextStyle,
} from "@/admin/lib/letterhead";
import { Button, Chips, IconButton, MoneyField, NumberField, SearchInput, TextArea, TextField, Toggle } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, SaveBar, Stat, Tabs } from "@/admin/ui/layout";
import { Modal, useConfirm, useToast } from "@/admin/ui/overlays";
import { ImagePicker } from "@/admin/ui/ImagePicker";
import { TextStyleBar } from "@/admin/ui/TextStyleBar";
import { LetterheadSheet, PrintSheet, ScaledSheet } from "@/admin/ui/LetterheadSheet";
import { InvoiceDocument, lineAmount, totalsFor, type BillTo, type Invoice, type InvoiceLine } from "@/admin/sections/invoices/InvoiceDocument";

type Tab = "list" | "letterhead" | "settings";

const STATUS: Record<Invoice["status"], { label: string; tone: "neutral" | "ok" | "warn" | "danger" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  issued: { label: "Unpaid", tone: "warn" },
  paid: { label: "Paid", tone: "ok" },
  void: { label: "Void", tone: "danger" },
};

const n = (v: unknown) => Number(v ?? 0);

function normalize(raw: Invoice): Invoice {
  return {
    ...raw,
    vat_rate: n(raw.vat_rate),
    subtotal: n(raw.subtotal),
    vat: n(raw.vat),
    total: n(raw.total),
    bill_to: raw.bill_to ?? {},
    lines: (raw.lines ?? []).map((l) => ({ description: l.description ?? "", quantity: n(l.quantity), unit_price: n(l.unit_price) })),
  };
}

export function InvoicesSection() {
  const t = useT();
  const { rest, navigate, can } = useAdmin();
  const first = rest[0] ?? "";
  const tab: Tab = first === "letterhead" && can("settings") ? "letterhead" : first === "settings" ? "settings" : "list";
  const openId = tab === "list" && first && first !== "letterhead" ? first : null;

  if (openId) return <InvoiceEditor id={openId} />;

  return (
    <>
      <PageHeader
        overline={t("01 — Paperwork")}
        title={t("Invoices & letterhead.")}
        subtitle={t("Make invoices on the café letterhead, and change what the letterhead says.")}
        actions={tab === "list" && <Button variant="primary" icon={<FilePlus2 size={16} />} onClick={() => navigate("invoices", "new")}>{t("New invoice")}</Button>}
      />
      <Tabs
        label={t("Invoice sections")}
        value={tab}
        onChange={(v) => navigate("invoices", v === "list" ? null : v)}
        tabs={[
          { value: "list" as Tab, label: t("Invoices") },
          ...(can("settings") ? [{ value: "letterhead" as Tab, label: t("Letterhead") }] : []),
          { value: "settings" as Tab, label: t("Invoice settings") },
        ]}
      />
      {tab === "list" ? <InvoiceList /> : tab === "letterhead" ? <LetterheadEditor /> : <InvoiceSettingsPanel />}
    </>
  );
}

/* ── List ───────────────────────────────────────────────────────────────── */

function InvoiceList() {
  const t = useT();
  const { navigate } = useAdmin();
  const list = useAsync(() => run<Invoice[]>(db.from("invoices").select("*").order("created_at", { ascending: false }).limit(500)), []);
  const [filter, setFilter] = useState<"all" | Invoice["status"]>("all");
  const [query, setQuery] = useState("");
  const rows = (list.data ?? []).map(normalize);
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => (filter === "all" || r.status === filter) && (!q || `${r.number ?? ""} ${r.bill_to.name ?? ""} ${r.bill_to.company ?? ""}`.toLowerCase().includes(q)));
  const unpaid = rows.filter((r) => r.status === "issued");
  const month = bahrainToday().slice(0, 7);
  const paidThisMonth = rows.filter((r) => r.status === "paid" && (r.paid_at ?? "").slice(0, 7) === month);

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-grid-4">
        <Stat label={t("Waiting to be paid")} value={money(unpaid.reduce((s, r) => s + r.total, 0))} note={t("{n} invoices", { n: unpaid.length })} alert={unpaid.some((r) => r.due_date && r.due_date < bahrainToday())} />
        <Stat label={t("Paid this month")} value={money(paidThisMonth.reduce((s, r) => s + r.total, 0))} note={t("{n} invoices", { n: paidThisMonth.length })} />
        <Stat label={t("Drafts")} value={rows.filter((r) => r.status === "draft").length} />
      </div>
      <div className="adm-spread">
        <Chips
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("All") },
            { value: "draft", label: t("Drafts") },
            { value: "issued", label: t("Unpaid") },
            { value: "paid", label: t("Paid") },
            { value: "void", label: t("Void") },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder={t("Search number or customer")} />
      </div>
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <LoadError message={list.error} onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title={rows.length ? t("No invoices match") : t("No invoices yet")}
          body={t("Make one from scratch, or open an order and choose “Make an invoice”.")}
          action={<Button icon={<FilePlus2 size={16} />} onClick={() => navigate("invoices", "new")}>{t("New invoice")}</Button>}
        />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t("Number")}</th>
                <th>{t("For")}</th>
                <th>{t("Date")}</th>
                <th className="adm-num">{t("Total")}</th>
                <th>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const overdue = r.status === "issued" && r.due_date && r.due_date < bahrainToday();
                return (
                  <tr key={r.id} className="is-clickable" onClick={() => navigate("invoices", r.id)}>
                    <td className="adm-strong" dir="ltr" style={{ textAlign: "start" }}>{r.number ?? t("Draft")}</td>
                    <td>{r.bill_to.name || "—"}{r.bill_to.company ? <div className="adm-small adm-muted">{r.bill_to.company}</div> : null}</td>
                    <td>{r.issue_date ? dateOnly(`${r.issue_date}T12:00:00Z`) : dateOnly(r.created_at)}</td>
                    <td className="adm-num">{money(r.status === "draft" ? totalsFor(r.lines, r.vat_rate).total : r.total)}</td>
                    <td>
                      <Badge tone={overdue ? "danger" : STATUS[r.status].tone}>{overdue ? t("Overdue") : t(STATUS[r.status].label)}</Badge>
                    </td>
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

type Draft = { bill_to: BillTo; lines: InvoiceLine[]; vat_rate: number; notes: string; issue_date: string; due_date: string };

function emptyDraft(s: InvoiceSettings): Draft {
  return { bill_to: {}, lines: [{ description: "", quantity: 1, unit_price: 0 }], vat_rate: s.vat_registered ? s.vat_rate : 0, notes: s.default_notes, issue_date: "", due_date: "" };
}

function draftFrom(inv: Invoice): Draft {
  return {
    bill_to: inv.bill_to ?? {},
    lines: inv.lines.length ? inv.lines : [{ description: "", quantity: 1, unit_price: 0 }],
    vat_rate: inv.vat_rate,
    notes: inv.notes ?? "",
    issue_date: inv.issue_date ?? "",
    due_date: inv.due_date ?? "",
  };
}

function InvoiceEditor({ id }: { id: string }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { navigate } = useAdmin();
  const isNew = id === "new";
  const head = useAsync(loadLetterhead, []);
  const settings = useAsync(loadInvoiceSettings, []);
  const invoice = useAsync(
    () => (isNew ? Promise.resolve({ ok: true as const, value: null }) : run<Invoice>(db.from("invoices").select("*").eq("id", id).single())),
    [id],
  );
  const inv = invoice.data ? normalize(invoice.data) : null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  useEffect(() => {
    if (isNew && settings.data && !draft) {
      const d = emptyDraft(settings.data);
      setDraft(d);
      setSaved(JSON.stringify(d));
    }
  }, [isNew, settings.data, draft]);

  useEffect(() => {
    if (inv) {
      const d = draftFrom(inv);
      setDraft(d);
      setSaved(JSON.stringify(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.data]);

  const editable = isNew || inv?.status === "draft";
  const dirty = editable && draft !== null && JSON.stringify(draft) !== saved;
  useUnsavedGuard(dirty);

  if (head.loading || settings.loading || invoice.loading || !draft) return <Loading />;
  if (invoice.error) return <LoadError message={invoice.error} onRetry={invoice.reload} />;
  const h = head.data ?? DEFAULT_LETTERHEAD;
  const s = settings.data ?? DEFAULT_INVOICE_SETTINGS;

  const setBill = (key: keyof BillTo, value: string) => setDraft({ ...draft, bill_to: { ...draft.bill_to, [key]: value } });
  const setLine = (i: number, patch: Partial<InvoiceLine>) => setDraft({ ...draft, lines: draft.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const totals = totalsFor(draft.lines, draft.vat_rate);

  const preview: Invoice = inv && !editable
    ? inv
    : {
        id: inv?.id ?? "new",
        number: null,
        status: "draft",
        order_id: inv?.order_id ?? null,
        letterhead: null,
        settings: null,
        paid_at: null,
        void_reason: null,
        created_at: inv?.created_at ?? new Date().toISOString(),
        updated_at: inv?.updated_at ?? new Date().toISOString(),
        ...draft,
        issue_date: draft.issue_date || null,
        due_date: draft.due_date || null,
        ...totals,
      };

  const save = async (quiet = false): Promise<string | null> => {
    setBusy("save");
    const r = await rpc<string>("admin_save_invoice", { p_id: isNew ? null : id, p_data: { ...draft, order_id: inv?.order_id ?? null } });
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
      return null;
    }
    setSaved(JSON.stringify(draft));
    if (!quiet) toast.ok(t("Draft saved"));
    if (isNew) navigate("invoices", r.value);
    else await invoice.reload();
    return r.value;
  };

  const issue = async () => {
    if (!draft.bill_to.name?.trim()) return toast.error(t("Add who the invoice is for before issuing it."));
    if (!draft.lines.some((l) => l.description.trim())) return toast.error(t("Add at least one line before issuing the invoice."));
    const ok = await confirm({
      title: t("Issue this invoice?"),
      body: t("It gets the next invoice number and can't be edited after that. If something is wrong later, you void it and make a new one."),
      confirmLabel: t("Issue invoice"),
    });
    if (!ok) return;
    const savedId = dirty || isNew ? await save(true) : id;
    if (!savedId) return;
    setBusy("issue");
    const r = await rpc<string>("admin_issue_invoice", { p_id: savedId });
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Invoice {number} issued", { number: r.value }));
    if (savedId !== id) navigate("invoices", savedId);
    else await invoice.reload();
  };

  const setStatus = async (status: "paid" | "issued" | "void", reason?: string) => {
    setBusy(status);
    const r = await rpc("admin_set_invoice_status", { p_id: id, p_status: status, p_reason: reason ?? null });
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.ok(status === "paid" ? t("Marked as paid") : status === "void" ? t("Invoice voided") : t("Marked as unpaid"));
    await invoice.reload();
  };

  const remove = async () => {
    const ok = await confirm({ title: t("Delete this draft?"), confirmLabel: t("Delete draft"), danger: true });
    if (!ok) return;
    const r = await rpc("admin_delete_invoice", { p_id: id });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Draft deleted"));
    navigate("invoices");
  };

  const duplicate = async () => {
    const r = await rpc<string>("admin_save_invoice", { p_id: null, p_data: { bill_to: draft.bill_to, lines: draft.lines, vat_rate: draft.vat_rate, notes: draft.notes } });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Copied into a new draft"));
    navigate("invoices", r.value);
  };

  const print = () => {
    setPrinting(true);
    window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  };

  const emailLink = () => {
    const to = draft.bill_to.email?.trim();
    const subject = `${h.name.replace(/\.$/, "")} invoice ${inv?.number ?? ""}`.trim();
    const body = `Hello ${draft.bill_to.name ?? ""},\n\nPlease find invoice ${inv?.number ?? ""} for ${money(inv?.total ?? totals.total)} attached.\n\n${h.name}`;
    window.location.href = `mailto:${to ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const status = inv?.status ?? "draft";

  return (
    <>
      <PageHeader
        overline={<button type="button" className="adm-link-back" onClick={() => navigate("invoices")}><ArrowLeft size={14} className="adm-flip-rtl" /> {t("All invoices")}</button>}
        title={inv?.number ?? (isNew ? t("New invoice") : t("Draft invoice"))}
        subtitle={
          status === "draft"
            ? t("Fill it in, check the preview, then issue it to give it a number.")
            : status === "paid"
              ? t("Paid {date}", { date: dateOnly(inv?.paid_at) })
              : status === "void"
                ? t("This invoice was voided.")
                : t("Issued. Waiting to be paid.")
        }
        actions={(
          <>
            <Button icon={<Printer size={16} />} onClick={print}>{t("Print or save as PDF")}</Button>
            {status !== "draft" && draft.bill_to.email && <Button icon={<Send size={16} />} onClick={emailLink}>{t("Email")}</Button>}
            {status === "draft" && <Button variant="primary" icon={<CheckCircle2 size={16} />} onClick={issue} loading={busy === "issue"}>{t("Issue invoice")}</Button>}
            {status === "issued" && <Button variant="primary" icon={<CheckCircle2 size={16} />} onClick={() => setStatus("paid")} loading={busy === "paid"}>{t("Mark as paid")}</Button>}
          </>
        )}
      />

      <div className="adm-invoice-layout">
        <div className="adm-stack" style={{ gap: 16 }}>
          {status === "void" && <Notice tone="danger" title={t("Void")}>{inv?.void_reason || t("No reason given.")}</Notice>}
          {inv?.order_id && (
            <Notice title={t("Made from an order")} action={<Button size="sm" onClick={() => navigate("orders", inv.order_id!)}>{t("Open order")}</Button>} />
          )}

          <Card title={t("Bill to")}>
            <div className="adm-form-grid">
              <TextField label={t("Name")} value={draft.bill_to.name ?? ""} onChange={(v) => setBill("name", v)} disabled={!editable} maxLength={120} />
              <TextField label={t("Company")} optional value={draft.bill_to.company ?? ""} onChange={(v) => setBill("company", v)} disabled={!editable} maxLength={120} />
              <TextField label={t("Email")} optional type="email" dir="ltr" value={draft.bill_to.email ?? ""} onChange={(v) => setBill("email", v)} disabled={!editable} maxLength={160} />
              <TextField label={t("Phone")} optional dir="ltr" value={draft.bill_to.phone ?? ""} onChange={(v) => setBill("phone", v)} disabled={!editable} maxLength={40} />
              <TextArea label={t("Address")} optional rows={2} value={draft.bill_to.address ?? ""} onChange={(v) => setBill("address", v)} disabled={!editable} maxLength={300} />
              <TextField label={t("Their VAT number")} optional dir="ltr" value={draft.bill_to.vat_number ?? ""} onChange={(v) => setBill("vat_number", v)} disabled={!editable} maxLength={40} />
            </div>
          </Card>

          <Card title={t("What it's for")}>
            <div className="adm-stack" style={{ gap: 10 }}>
              {draft.lines.map((l, i) => (
                <div key={i} className="adm-invoice-line">
                  <TextField label={t("Description")} value={l.description} onChange={(v) => setLine(i, { description: v })} disabled={!editable} maxLength={300} placeholder={t("e.g. Coffee catering, 20 people")} />
                  <NumberField label={t("Qty")} value={l.quantity} onChange={(v) => setLine(i, { quantity: v ?? 0 })} disabled={!editable} min={0} />
                  <MoneyField label={t("Unit price")} value={l.unit_price} onChange={(v) => setLine(i, { unit_price: v ?? 0 })} disabled={!editable} />
                  <span className="adm-invoice-amount adm-num">{money(lineAmount(l))}</span>
                  {editable && (
                    <IconButton label={t("Remove line")} onClick={() => setDraft({ ...draft, lines: draft.lines.length > 1 ? draft.lines.filter((_, k) => k !== i) : [{ description: "", quantity: 1, unit_price: 0 }] })}>
                      <Trash2 size={16} />
                    </IconButton>
                  )}
                </div>
              ))}
              {editable && (
                <div><Button size="sm" icon={<Plus size={14} />} onClick={() => setDraft({ ...draft, lines: [...draft.lines, { description: "", quantity: 1, unit_price: 0 }] })}>{t("Add a line")}</Button></div>
              )}
              <div className="adm-invoice-totals">
                <span>{t("Subtotal")}</span><strong className="adm-num">{money(totals.subtotal)}</strong>
                {draft.vat_rate > 0 && <><span>{t("VAT {rate}%", { rate: draft.vat_rate })}</span><strong className="adm-num">{money(totals.vat)}</strong></>}
                <span>{t("Total")}</span><strong className="adm-num" style={{ fontSize: 20 }}>{money(totals.total)}</strong>
              </div>
            </div>
          </Card>

          <Card title={t("Details")}>
            <div className="adm-stack">
              {(s.vat_registered || draft.vat_rate > 0) && (
                <Toggle
                  label={t("Add VAT ({rate}%)", { rate: s.vat_rate })}
                  description={s.vat_registered ? t("Shown as a tax invoice with your VAT number.") : t("Your VAT registration is off in Invoice settings.")}
                  checked={draft.vat_rate > 0}
                  onChange={(v) => setDraft({ ...draft, vat_rate: v ? s.vat_rate : 0 })}
                  disabled={!editable}
                />
              )}
              <div className="adm-form-grid">
                <TextField label={t("Invoice date")} type="date" value={draft.issue_date} onChange={(v) => setDraft({ ...draft, issue_date: v })} disabled={!editable} hint={editable ? t("Leave empty to use the day you issue it.") : undefined} />
                <TextField label={t("Due date")} type="date" value={draft.due_date} onChange={(v) => setDraft({ ...draft, due_date: v })} disabled={!editable} hint={editable ? t("Leave empty for {n} days after the invoice date.", { n: s.due_days }) : undefined} />
              </div>
              <TextArea label={t("Notes on the invoice")} optional rows={3} value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} disabled={!editable} maxLength={2000} />
            </div>
          </Card>

          <div className="adm-row" style={{ flexWrap: "wrap" }}>
            {status === "draft" && !isNew && <Button variant="danger" icon={<Trash2 size={16} />} onClick={remove}>{t("Delete draft")}</Button>}
            {(status === "issued" || status === "paid") && <Button variant="danger" icon={<Ban size={16} />} onClick={() => setVoidOpen(true)}>{t("Void invoice")}</Button>}
            {status === "paid" && <Button onClick={() => setStatus("issued")} loading={busy === "issued"}>{t("Mark as unpaid")}</Button>}
            {!isNew && <Button icon={<Copy size={16} />} onClick={duplicate}>{t("Copy into a new invoice")}</Button>}
          </div>
        </div>

        <div className="adm-invoice-preview">
          <p className="adm-overline" style={{ marginBottom: 8 }}>{t("Preview")}</p>
          <ScaledSheet><InvoiceDocument invoice={preview} head={h} settings={s} /></ScaledSheet>
        </div>
      </div>

      {editable && <SaveBar dirty={dirty} saving={busy === "save"} onSave={() => void save()} message={t("This draft has unsaved changes")} />}
      {printing && <PrintSheet><InvoiceDocument invoice={preview} head={h} settings={s} /></PrintSheet>}
      <VoidModal open={voidOpen} onClose={() => setVoidOpen(false)} onVoid={async (reason) => { setVoidOpen(false); await setStatus("void", reason); }} />
    </>
  );
}

function VoidModal({ open, onClose, onVoid }: { open: boolean; onClose: () => void; onVoid: (reason: string) => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Void this invoice?")}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="danger" onClick={() => onVoid(reason.trim())}>{t("Void invoice")}</Button>
        </>
      )}
    >
      <div className="adm-stack">
        <p>{t("The number stays used and the invoice is kept, marked VOID. Make a new invoice if one is still needed.")}</p>
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
              value={draft.logo_url && draft.logo_url !== DEFAULT_LOGO ? draft.logo_url : null}
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
  const example = useMemo(() => `${(draft?.prefix || "INV").toUpperCase().replace(/[^A-Z0-9]/g, "") || "INV"}-${bahrainToday().slice(0, 4)}-0001`, [draft?.prefix]);

  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <LoadError message={loaded.error} onRetry={loaded.reload} />;
  if (!draft) return null;

  const save = async () => {
    setSaving(true);
    const r = await saveInvoiceSettings({ ...draft, prefix: draft.prefix.toUpperCase().replace(/[^A-Z0-9]/g, "") || "INV" });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Invoice settings saved"));
    await loaded.reload();
  };

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 720 }}>
      <Card title={t("Numbering")}>
        <TextField label={t("Number starts with")} value={draft.prefix} onChange={(v) => setDraft({ ...draft, prefix: v })} maxLength={8} dir="ltr" hint={t("Invoices are numbered like {example}. Numbers never repeat or skip.", { example })} />
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
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setDraft(loaded.data ?? null)} />
    </div>
  );
}
