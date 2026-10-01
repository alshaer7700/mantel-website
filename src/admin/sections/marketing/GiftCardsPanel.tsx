import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CreditCard, Download, Plus } from "lucide-react";
import { useT } from "@/admin/i18n";
import { db, rpc, run } from "@/admin/lib/db";
import { useAsync } from "@/admin/lib/useAsync";
import { bahrainToday, dateOnly, dateTime, money } from "@/admin/lib/format";
import { loadLetterhead, type Letterhead } from "@/admin/lib/letterhead";
import { downloadSheetPdf } from "@/admin/lib/pdf";
import { Button, Chips, MoneyField, SearchInput, SelectField, TextArea, TextField } from "@/admin/ui/controls";
import { Badge, EmptyState, LoadError, Loading, Stat } from "@/admin/ui/layout";
import { LetterheadSheet } from "@/admin/ui/LetterheadSheet";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";

/*
 * Gift cards sold at the counter: a code (MTL-XXXX-XXXX) with a balance.
 * Staff take what's spent off the card; every change is kept in
 * gift_card_moves. The rules live in supabase/038.
 */

type GiftCard = {
  code: string;
  initial_amount: number;
  balance: number;
  status: "active" | "void";
  recipient_name: string;
  recipient_email: string;
  from_name: string;
  message: string;
  paid_by: PaidBy;
  expires_on: string | null;
  void_reason: string | null;
  created_at: string;
};
type Move = { id: number; amount: number; kind: "issue" | "spend" | "refund" | "void"; note: string; balance: number; created_at: string };
type PaidBy = "cash" | "card" | "transfer" | "benefitpay" | "free";

const expired = (g: GiftCard) => !!g.expires_on && g.expires_on < bahrainToday();

function cardState(g: GiftCard): "active" | "used" | "expired" | "void" {
  if (g.status === "void") return "void";
  if (expired(g)) return "expired";
  return Number(g.balance) <= 0 ? "used" : "active";
}

const CODE_RE = /^MTL-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** People type codes any old way: "mtl 24r8 58xk" → MTL-24R8-58XK. */
function cleanCode(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^MTL/, "");
  return raw.length === 8 ? `MTL-${raw.slice(0, 4)}-${raw.slice(4)}` : v.trim().toUpperCase();
}

export function GiftCardsPanel() {
  const t = useT();
  const list = useAsync(() => run<GiftCard[]>(db.from("gift_cards").select("*").order("created_at", { ascending: false })), []);
  const [filter, setFilter] = useState<"active" | "used" | "all">("active");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = (list.data ?? []).map((g) => ({ ...g, initial_amount: Number(g.initial_amount), balance: Number(g.balance) }));
  const active = rows.filter((g) => cardState(g) === "active");
  const outstanding = active.reduce((s, g) => s + g.balance, 0);
  const shown = useMemo(() => rows.filter((g) => {
    const st = cardState(g);
    if (filter === "active" && st !== "active") return false;
    if (filter === "used" && st === "active") return false;
    const q = query.trim().toUpperCase();
    if (!q) return true;
    const code = q.replace(/[^A-Z0-9]/g, "");
    return (!!code && g.code.replace(/-/g, "").includes(code)) || g.recipient_name.toUpperCase().includes(q) || g.from_name.toUpperCase().includes(q);
  }), [rows, filter, query]);

  /* A full code typed into the search opens that card. */
  useEffect(() => {
    const c = cleanCode(query);
    if (CODE_RE.test(c) && rows.some((g) => g.code === c)) setOpen(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const label = (st: ReturnType<typeof cardState>) => ({ active: t("Has balance"), used: t("Used up"), expired: t("Expired"), void: t("Cancelled") })[st];

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-grid-4">
        <Stat label={t("Cards with balance")} value={active.length} />
        <Stat label={t("Still to be spent")} value={money(outstanding)} note={t("What customers can still use")} />
      </div>
      <div className="adm-spread">
        <Chips
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: t("Has balance"), count: active.length },
            { value: "used", label: t("Finished") },
            { value: "all", label: t("All") },
          ]}
        />
        <div className="adm-row">
          <SearchInput value={query} onChange={setQuery} placeholder={t("Code or name")} />
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>{t("Sell a gift card")}</Button>
        </div>
      </div>
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <LoadError message={list.error} onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={32} />}
          title={rows.length ? t("No gift cards here") : t("No gift cards yet")}
          body={rows.length ? undefined : t("Sell one at the counter and print it or send it as a PDF.")}
        />
      ) : (
        <div className="adm-list">
          {shown.map((g) => {
            const st = cardState(g);
            return (
              <button key={g.code} type="button" className="adm-list-row" onClick={() => setOpen(g.code)}>
                <span className="adm-list-main">
                  <span className="adm-list-title adm-mono" dir="ltr" style={{ textAlign: "start" }}>{g.code}</span>
                  <span className="adm-list-meta">
                    {[g.recipient_name ? t("For {name}", { name: g.recipient_name }) : null, t("Sold {date}", { date: dateOnly(g.created_at) })].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="adm-list-side">
                  <span className="adm-small">{t("{left} of {total}", { left: money(g.balance), total: money(g.initial_amount) })}</span>
                  <Badge tone={st === "active" ? "ok" : st === "void" ? "danger" : "neutral"} dot>{label(st)}</Badge>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {creating && (
        <NewGiftCard
          onClose={() => setCreating(false)}
          onCreated={async (code) => {
            setCreating(false);
            await list.reload();
            setOpen(code);
          }}
        />
      )}
      {open && (
        <GiftCardDrawer
          key={open}
          code={open}
          onClose={() => {
            setOpen(null);
            if (CODE_RE.test(cleanCode(query))) setQuery("");
          }}
          onChanged={() => void list.reload()}
          stateLabel={label}
        />
      )}
    </div>
  );
}

/* ── Selling one ─────────────────────────────────────────────────────────── */

function NewGiftCard({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const t = useT();
  const toast = useToast();
  const [amount, setAmount] = useState<number | null>(10);
  const [paidBy, setPaidBy] = useState<PaidBy>("cash");
  const [to, setTo] = useState("");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [expires, setExpires] = useState(() => {
    const d = new Date(`${bahrainToday()}T12:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const amountOk = !!amount && amount > 0 && amount <= 1000;

  const create = async () => {
    if (!amountOk) return toast.error(t("Check the highlighted fields."));
    setSaving(true);
    const r = await rpc<string>("admin_gift_card_issue", {
      p_data: { amount, paid_by: paidBy, recipient_name: to, recipient_email: email, from_name: from, message, expires_on: expires || null },
    });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Gift card {code} is ready", { code: r.value }));
    onCreated(r.value);
  };

  return (
    <Drawer
      open
      title={t("Sell a gift card")}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" onClick={() => void create()} loading={saving}>{t("Create gift card")}</Button>
        </>
      )}
    >
      <div className="adm-stack">
        <div className="adm-form-grid">
          <MoneyField label={t("Amount")} value={amount} onChange={setAmount} min={0} error={amount !== null && !amountOk ? t("Between BD 0.001 and BD 1000") : undefined} />
          <SelectField
            label={t("Paid by")}
            value={paidBy}
            onChange={(v) => setPaidBy(v as PaidBy)}
            options={[
              { value: "cash", label: t("Cash") },
              { value: "card", label: t("Card") },
              { value: "benefitpay", label: t("BenefitPay") },
              { value: "transfer", label: t("Bank transfer") },
              { value: "free", label: t("Free (a gift from Mantel)") },
            ]}
          />
        </div>
        <div className="adm-form-grid">
          <TextField label={t("For")} optional value={to} onChange={setTo} maxLength={120} placeholder={t("Who it's for")} />
          <TextField label={t("From")} optional value={from} onChange={setFrom} maxLength={120} />
        </div>
        <TextField label={t("Their email")} optional type="email" value={email} onChange={setEmail} maxLength={254} dir="ltr" hint={t("Kept with the card, for your records.")} />
        <TextArea label={t("Message on the card")} optional value={message} onChange={setMessage} maxLength={500} rows={3} />
        <TextField label={t("Use by")} optional type="date" value={expires} onChange={setExpires} hint={t("Blank: never expires")} />
      </div>
    </Drawer>
  );
}

/* ── One card ────────────────────────────────────────────────────────────── */

function GiftCardDrawer({ code, onClose, onChanged, stateLabel }: { code: string; onClose: () => void; onChanged: () => void; stateLabel: (s: ReturnType<typeof cardState>) => string }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const card = useAsync(() => run<GiftCard>(db.from("gift_cards").select("*").eq("code", code).single()), [code]);
  const moves = useAsync(() => run<Move[]>(db.from("gift_card_moves").select("*").eq("code", code).order("created_at", { ascending: false })), [code]);
  const [spend, setSpend] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Letterhead | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const g = card.data ? { ...card.data, balance: Number(card.data.balance), initial_amount: Number(card.data.initial_amount) } : null;
  const st = g ? cardState(g) : "active";

  const take = async () => {
    if (!g || !spend || spend <= 0) return;
    if (spend > g.balance) return toast.error(t("That is more than the card has left."));
    setBusy(true);
    const r = await rpc<GiftCard>("admin_gift_card_spend", { p_code: code, p_amount: spend, p_note: note.trim() });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("{amount} taken off. {left} left.", { amount: money(spend), left: money(r.value.balance) }));
    setSpend(null);
    setNote("");
    card.setData(r.value);
    void moves.reload();
    onChanged();
  };

  const cancel = async () => {
    if (!(await confirm({
      title: t("Cancel {code}?", { code }),
      body: t("The card stops working and its balance goes to zero. This can't be undone."),
      confirmLabel: t("Cancel the card"),
      danger: true,
    }))) return;
    const r = await rpc("admin_gift_card_void", { p_code: code, p_reason: "" });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Cancelled"));
    void card.reload();
    void moves.reload();
    onChanged();
  };

  const pdf = async () => {
    setPdfBusy(true);
    const head = await loadLetterhead();
    if (!head.ok) {
      setPdfBusy(false);
      return toast.error(head.error);
    }
    setSheet(head.value);
  };

  useEffect(() => {
    if (!sheet) return;
    const node = sheetRef.current?.querySelector<HTMLElement>(".mtl-sheet");
    if (!node) return;
    void downloadSheetPdf(node, `mantel-gift-card-${code}`).then((r) => {
      setSheet(null);
      setPdfBusy(false);
      if (!r.ok) toast.error(t(r.error));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const moveLabel = (m: Move) => ({ issue: t("Sold"), spend: t("Spent"), refund: t("Put back"), void: t("Cancelled") })[m.kind];

  return (
    <Drawer
      open
      title={<span className="adm-mono" dir="ltr">{code}</span>}
      onClose={onClose}
      footer={g && (
        <>
          {g.status === "active" && <Button variant="ghost" icon={<Ban size={16} />} onClick={() => void cancel()}>{t("Cancel the card")}</Button>}
          <Button icon={<Download size={16} />} onClick={() => void pdf()} loading={pdfBusy} disabled={g.status === "void"}>{t("Download PDF")}</Button>
        </>
      )}
    >
      {card.loading && !card.data ? (
        <Loading />
      ) : card.error || !g ? (
        <LoadError message={card.error} onRetry={card.reload} />
      ) : (
        <div className="adm-stack">
          <div className="adm-spread" style={{ alignItems: "center" }}>
            <div>
              <div className="adm-stamp-count">{money(g.balance)}</div>
              <div className="adm-small adm-muted">{t("left of {total}", { total: money(g.initial_amount) })}</div>
            </div>
            <Badge tone={st === "active" ? "ok" : st === "void" ? "danger" : "neutral"} dot>{stateLabel(st)}</Badge>
          </div>
          {st === "active" && (
            <div className="adm-card adm-stack">
              <div className="adm-form-grid">
                <MoneyField label={t("Take off the card")} value={spend} onChange={setSpend} min={0} hint={t("What this purchase costs.")} />
                <TextField label={t("Note")} optional value={note} onChange={setNote} maxLength={200} placeholder={t("e.g. 2 flat whites")} />
              </div>
              <div className="adm-row">
                <Button variant="primary" onClick={() => void take()} loading={busy} disabled={!spend || spend <= 0}>{t("Take it off")}</Button>
                {spend !== g.balance && <Button onClick={() => setSpend(g.balance)}>{t("Use all {amount}", { amount: money(g.balance) })}</Button>}
              </div>
            </div>
          )}
          <dl className="adm-dl">
            {g.recipient_name && <><dt>{t("For")}</dt><dd>{g.recipient_name}</dd></>}
            {g.from_name && <><dt>{t("From")}</dt><dd>{g.from_name}</dd></>}
            {g.recipient_email && <><dt>{t("Email")}</dt><dd dir="ltr">{g.recipient_email}</dd></>}
            {g.message && <><dt>{t("Message")}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{g.message}</dd></>}
            <dt>{t("Use by")}</dt><dd>{g.expires_on ? dateOnly(`${g.expires_on}T12:00:00+03:00`) : t("No end date")}</dd>
            <dt>{t("Sold")}</dt><dd>{dateTime(g.created_at)}</dd>
          </dl>
          <h3 className="adm-overline" style={{ margin: 0 }}>{t("History")}</h3>
          {moves.data && (
            <div className="adm-list">
              {moves.data.map((m) => (
                <div key={m.id} className="adm-list-row">
                  <span className="adm-list-main">
                    <span className="adm-list-title">{moveLabel(m)}</span>
                    <span className="adm-list-meta">{[dateTime(m.created_at), m.kind === "issue" ? null : m.note].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="adm-list-side">
                    <span className="adm-mono">{Number(m.amount) > 0 ? "+" : "−"}{money(Math.abs(Number(m.amount)))}</span>
                    <span className="adm-small adm-muted">{t("{amount} left", { amount: money(m.balance) })}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {sheet && g && createPortal(
        <div ref={sheetRef} className="adm-print-offscreen" aria-hidden="true">
          <LetterheadSheet head={sheet}>
            <div className="mtl-gift">
              <div className="mtl-label">GIFT CARD</div>
              <div className="mtl-gift-amount">{money(g.initial_amount)}</div>
              {g.recipient_name && <p className="mtl-gift-line">For {g.recipient_name}</p>}
              {g.message && <p className="mtl-gift-message">{g.message}</p>}
              {g.from_name && <p className="mtl-gift-line">— {g.from_name}</p>}
              <div className="mtl-gift-code">
                <div className="mtl-label">CODE</div>
                <div className="mtl-gift-code-value">{g.code}</div>
              </div>
              <p className="mtl-small">
                Show this code at the counter. {g.expires_on ? `Use by ${dateOnly(`${g.expires_on}T12:00:00+03:00`)}. ` : ""}It can be used over several visits until the balance runs out.
              </p>
            </div>
          </LetterheadSheet>
        </div>,
        document.body,
      )}
    </Drawer>
  );
}
