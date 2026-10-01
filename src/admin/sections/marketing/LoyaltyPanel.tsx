import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Gift, MessageCircle, Plus, Search, Smartphone, Stamp, Wallet } from "lucide-react";
import { useT } from "@/admin/i18n";
import { db, getSetting, rpc, saveSetting } from "@/admin/lib/db";
import { useAsync, type AsyncState } from "@/admin/lib/useAsync";
import { dateOnly, dateTime } from "@/admin/lib/format";
import { Button, Chips, NumberField, SearchInput, TextField, Toggle } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, Stat } from "@/admin/ui/layout";
import { Modal, useConfirm, useToast } from "@/admin/ui/overlays";

/*
 * The stamp card. Its number is the customer's mobile: they say it at the
 * counter, or show the card in Apple Wallet (its barcode is the same number,
 * so a barcode scanner simply types it into the box below). Completed orders
 * placed with that mobile stamp the card on their own; staff add stamps for
 * counter sales and give the reward. The rules live in supabase/038.
 */

export type LoyaltySettings = { enabled: boolean; stamps_needed: number; reward: string };
export const LOYALTY_DEFAULTS: LoyaltySettings = { enabled: false, stamps_needed: 9, reward: "A free drink of your choice" };

type HistoryRow = { at: string; kind: "order" | "stamp" | "reward"; delta: number; note: string };
type CardInfo = {
  phone: string;
  name: string | null;
  stamps: number;
  needed: number;
  reward: string;
  enabled: boolean;
  from_orders: number;
  from_counter: number;
  rewards_given: number;
  has_card: boolean;
  pass_token: string | null;
  since: string | null;
  history: HistoryRow[];
};
type CardRow = Omit<CardInfo, "history" | "pass_token" | "since"> & { last_visit: string | null };

/** +97338434118 → +973 3843 4118, which is how people read it out. */
export function prettyPhone(p: string): string {
  const m = /^\+973(\d{4})(\d{4})$/.exec(p);
  return m ? `+973 ${m[1]} ${m[2]}` : p;
}

export function walletLink(token: string): string {
  return `${window.location.origin}/wallet?t=${token}`;
}

export function LoyaltyPanel() {
  const t = useT();
  const settings = useAsync(() => getSetting<LoyaltySettings>("marketing.loyalty", LOYALTY_DEFAULTS), []);
  const cards = useAsync(() => rpc<CardRow[]>("admin_loyalty_cards"), []);
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState<CardInfo | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState("");
  const [filter, setFilter] = useState<"ready" | "all">("all");
  const [query, setQuery] = useState("");

  const find = async (value = phone) => {
    if (!value.trim()) return setFindError(t("Enter the customer's mobile number."));
    setFinding(true);
    setFindError("");
    const r = await rpc<CardInfo>("admin_loyalty_lookup", { p_phone: value });
    setFinding(false);
    if (!r.ok) return setFindError(r.error);
    setCard(r.value);
    setPhone(prettyPhone(r.value.phone));
  };

  const updated = (c: CardInfo) => {
    setCard(c);
    void cards.reload();
  };

  const rows = cards.data ?? [];
  const ready = rows.filter((c) => c.stamps >= c.needed).length;
  const shown = useMemo(() => rows.filter((c) => {
    if (filter === "ready" && c.stamps < c.needed) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const digits = q.replace(/\D/g, "");
    return (c.name ?? "").toLowerCase().includes(q) || (!!digits && c.phone.includes(digits));
  }), [rows, filter, query]);

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      {settings.data && !settings.data.enabled && (
        <Notice tone="warn" title={t("The stamp card is switched off")}>
          {t("Stamps are still counted, but customers don't see the card on the website yet. Switch it on in the settings below.")}
        </Notice>
      )}

      <Card title={t("Find a stamp card")} subtitle={t("Type the customer's mobile number, or scan the card in their Apple Wallet.")}>
        <form
          className="adm-row"
          style={{ alignItems: "flex-end", flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            void find();
          }}
        >
          <div style={{ flex: 1 }}>
            <TextField
              label={t("Mobile number")}
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setFindError("");
              }}
              inputMode="tel"
              autoComplete="off"
              dir="ltr"
              placeholder="3xxx xxxx"
              error={findError || undefined}
            />
          </div>
          <Button type="submit" variant="primary" icon={<Search size={16} />} loading={finding} style={{ marginBottom: findError ? 30 : 0 }}>{t("Find")}</Button>
        </form>
      </Card>

      {card && <CardView card={card} onChange={updated} onClose={() => setCard(null)} />}

      <div className="adm-grid-4">
        <Stat label={t("Stamp cards")} value={rows.length} />
        <Stat label={t("Rewards waiting")} value={ready} note={t("Cards that are full")} alert={ready > 0} onClick={ready ? () => setFilter("ready") : undefined} />
        <Stat label={t("Rewards given")} value={rows.reduce((s, c) => s + c.rewards_given, 0)} />
      </div>

      <div className="adm-spread">
        <Chips
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("All cards"), count: rows.length },
            { value: "ready", label: t("Reward waiting"), count: ready },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder={t("Search names or numbers")} />
      </div>

      {cards.loading && !cards.data ? (
        <Loading />
      ) : cards.error ? (
        <LoadError message={cards.error} onRetry={cards.reload} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Stamp size={32} />}
          title={rows.length ? t("No cards match") : t("No stamp cards yet")}
          body={rows.length ? undefined : t("A card starts the first time you stamp a mobile number, or when an order with a mobile is completed.")}
        />
      ) : (
        <div className="adm-list">
          {shown.map((c) => (
            <button key={c.phone} type="button" className="adm-list-row" onClick={() => void find(c.phone)}>
              <span className="adm-list-main">
                <span className="adm-list-title">{c.name || prettyPhone(c.phone)}</span>
                <span className="adm-list-meta" dir="ltr" style={{ textAlign: "start" }}>
                  {[c.name ? prettyPhone(c.phone) : null, c.last_visit ? dateOnly(c.last_visit) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="adm-list-side">
                <span className="adm-small adm-muted">{t("{n} of {max}", { n: Math.min(c.stamps, c.needed), max: c.needed })}</span>
                {c.stamps >= c.needed && <Badge tone="ok" dot>{t("Reward waiting")}</Badge>}
              </span>
            </button>
          ))}
        </div>
      )}

      <LoyaltySettingsCard settings={settings} />
    </div>
  );
}

/* ── One card ────────────────────────────────────────────────────────────── */

function StampDots({ stamps, needed }: { stamps: number; needed: number }) {
  const t = useT();
  const filled = Math.min(stamps, needed);
  return (
    <div className="adm-stamps" role="img" aria-label={t("{n} of {max} stamps", { n: filled, max: needed })}>
      {Array.from({ length: needed }, (_, i) => (
        <span key={i} className={`adm-stamp${i < filled ? " is-on" : ""}${i === needed - 1 ? " is-reward" : ""}`}>
          {i === needed - 1 ? <Gift size={14} aria-hidden="true" /> : i < filled ? <Stamp size={14} aria-hidden="true" /> : null}
        </span>
      ))}
    </div>
  );
}

function CardView({ card, onChange, onClose }: { card: CardInfo; onChange: (c: CardInfo) => void; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"" | "stamp" | "reward" | "name">("");
  const [several, setSeveral] = useState(false);
  const [wallet, setWallet] = useState(false);
  const [name, setName] = useState(card.name ?? "");
  useEffect(() => setName(card.name ?? ""), [card.phone, card.name]);
  const full = card.stamps >= card.needed;
  const extra = Math.max(0, card.stamps - card.needed);

  const stamp = async (count: number, note = "") => {
    setBusy("stamp");
    const r = await rpc<CardInfo>("admin_loyalty_stamp", { p_phone: card.phone, p_count: count, p_note: note, p_name: name.trim() || null });
    setBusy("");
    if (!r.ok) return toast.error(r.error);
    onChange(r.value);
    toast.ok(count === 1 ? t("Stamp added") : t("{n} stamps added", { n: count }));
  };

  const reward = async () => {
    if (!(await confirm({
      title: t("Give the reward?"),
      body: t("{reward}. This uses {n} stamps from the card.", { reward: card.reward, n: card.needed }),
      confirmLabel: t("Give reward"),
    }))) return;
    setBusy("reward");
    const r = await rpc<CardInfo>("admin_loyalty_reward", { p_phone: card.phone, p_note: "" });
    setBusy("");
    if (!r.ok) return toast.error(r.error);
    onChange(r.value);
    toast.ok(t("Reward given"));
  };

  const saveName = async () => {
    setBusy("name");
    const r = await rpc<CardInfo>("admin_loyalty_save_card", { p_phone: card.phone, p_name: name.trim() });
    setBusy("");
    if (!r.ok) return toast.error(r.error);
    onChange(r.value);
    toast.ok(t("Saved"));
  };

  const openWallet = async () => {
    if (card.has_card && card.pass_token) return setWallet(true);
    const r = await rpc<CardInfo>("admin_loyalty_save_card", { p_phone: card.phone, p_name: name.trim() });
    if (!r.ok) return toast.error(r.error);
    onChange(r.value);
    setWallet(true);
  };

  return (
    <Card
      title={card.name || prettyPhone(card.phone)}
      subtitle={<span dir="ltr">{prettyPhone(card.phone)}</span>}
      actions={<Button size="sm" variant="ghost" onClick={onClose}>{t("Close")}</Button>}
    >
      <div className="adm-stack">
        <div className="adm-spread" style={{ alignItems: "center" }}>
          <StampDots stamps={card.stamps} needed={card.needed} />
          <div style={{ textAlign: "end" }}>
            <div className="adm-stamp-count">{t("{n} of {max}", { n: Math.min(card.stamps, card.needed), max: card.needed })}</div>
            {extra > 0 && <div className="adm-small adm-muted">{t("+{n} towards the next card", { n: extra })}</div>}
          </div>
        </div>
        {full ? (
          <Notice tone="ok" title={t("Reward waiting")}>{card.reward}</Notice>
        ) : (
          <p className="adm-small adm-muted" style={{ margin: 0 }}>
            {t("{n} more for: {reward}", { n: card.needed - card.stamps, reward: card.reward })}
          </p>
        )}
        <div className="adm-row">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => void stamp(1)} loading={busy === "stamp"}>{t("Add 1 stamp")}</Button>
          <Button onClick={() => setSeveral(true)}>{t("Add several")}</Button>
          <Button variant={full ? "primary" : "secondary"} icon={<Gift size={16} />} onClick={() => void reward()} disabled={!full} loading={busy === "reward"}>{t("Give reward")}</Button>
          <Button icon={<Wallet size={16} />} onClick={() => void openWallet()}>{t("Apple Wallet")}</Button>
        </div>
        <div className="adm-row" style={{ alignItems: "flex-end", flexWrap: "nowrap" }}>
          <div style={{ flex: 1 }}>
            <TextField label={t("Name on the card")} optional value={name} onChange={setName} maxLength={120} />
          </div>
          {name.trim() !== (card.name ?? "") && <Button onClick={() => void saveName()} loading={busy === "name"}>{t("Save")}</Button>}
        </div>
        <p className="adm-small adm-muted" style={{ margin: 0 }}>
          {[
            t("{n} from orders", { n: card.from_orders }),
            t("{n} added at the counter", { n: card.from_counter }),
            t("{n} rewards given", { n: card.rewards_given }),
            card.since ? t("Card since {date}", { date: dateOnly(card.since) }) : null,
          ].filter(Boolean).join(" · ")}
        </p>
        {card.history.length > 0 && (
          <div className="adm-list">
            {card.history.map((h, i) => (
              <div key={i} className="adm-list-row">
                <span className="adm-list-main">
                  <span className="adm-list-title">
                    {h.kind === "order" ? t("Order {ref}", { ref: h.note }) : h.kind === "reward" ? t("Reward given") : h.delta === 1 ? t("Stamp at the counter") : t("{n} stamps at the counter", { n: h.delta })}
                  </span>
                  <span className="adm-list-meta">{[dateTime(h.at), h.kind !== "order" ? h.note : null].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="adm-list-side adm-mono">{h.delta > 0 ? `+${h.delta}` : h.delta}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {several && <SeveralModal onClose={() => setSeveral(false)} onAdd={async (n, note) => { await stamp(n, note); setSeveral(false); }} />}
      {wallet && card.pass_token && <WalletModal card={card} onClose={() => setWallet(false)} />}
    </Card>
  );
}

function SeveralModal({ onClose, onAdd }: { onClose: () => void; onAdd: (n: number, note: string) => Promise<void> }) {
  const t = useT();
  const [n, setN] = useState<number | null>(2);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = !!n && n >= 1 && n <= 20;
  return (
    <Modal
      open
      title={t("Add several stamps")}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" disabled={!ok} loading={busy} onClick={async () => { setBusy(true); await onAdd(n ?? 1, note.trim()); setBusy(false); }}>{t("Add stamps")}</Button>
        </>
      )}
    >
      <div className="adm-stack">
        <NumberField label={t("How many")} value={n} onChange={setN} min={1} max={20} hint={t("One per drink, usually.")} error={n !== null && !ok ? t("Between 1 and 20") : undefined} />
        <TextField label={t("Note")} optional value={note} onChange={setNote} maxLength={200} placeholder={t("e.g. 3 lattes for the office")} />
      </div>
    </Modal>
  );
}

/* ── Apple Wallet ────────────────────────────────────────────────────────── */

function WalletModal({ card, onClose }: { card: CardInfo; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const link = walletLink(card.pass_token as string);
  const [qr, setQr] = useState("");
  const status = useAsync(async () => {
    const { data, error } = await db.functions.invoke<{ ready: boolean }>("loyalty-pass", { body: { status: true } });
    return error ? { ok: true as const, value: { ready: false } } : { ok: true as const, value: data ?? { ready: false } };
  }, []);
  useEffect(() => {
    void QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#000000", light: "#ffffff" } }).then(setQr);
  }, [link]);
  const local = card.phone.replace(/^\+/, "");
  const whatsapp = `https://wa.me/${local}?text=${encodeURIComponent(`${t("Your Mantel stamp card for Apple Wallet:")} ${link}`)}`;

  return (
    <Modal open title={t("Add to Apple Wallet")} onClose={onClose} footer={<Button onClick={onClose}>{t("Done")}</Button>}>
      <div className="adm-stack">
        {status.data && !status.data.ready && (
          <Notice tone="warn" title={t("Apple Wallet isn't connected yet")}>
            {t("The card needs Mantel's Apple certificate before iPhones will accept it. Until then the link opens a page with their live stamps instead.")}
          </Notice>
        )}
        <p className="adm-small" style={{ margin: 0 }}>{t("Ask the customer to point their iPhone camera at this code, then tap Add.")}</p>
        {qr ? <img src={qr} alt={t("QR code for the Apple Wallet card")} className="adm-wallet-qr" style={{ justifySelf: "center" }} /> : <Loading />}
        <div className="adm-row" style={{ justifyContent: "center" }}>
          <Button icon={<Copy size={16} />} onClick={() => void navigator.clipboard.writeText(link).then(() => toast.ok(t("Link copied")))}>{t("Copy link")}</Button>
          <a className="adm-btn" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" />{t("Send by WhatsApp")}</a>
        </div>
        <p className="adm-small adm-muted" style={{ margin: 0 }}>
          <Smartphone size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {t("The barcode on the card is the mobile number, so scanning it here finds the card.")}
        </p>
      </div>
    </Modal>
  );
}

/* ── Settings ────────────────────────────────────────────────────────────── */

function LoyaltySettingsCard({ settings }: { settings: AsyncState<LoyaltySettings> }) {
  const t = useT();
  const toast = useToast();
  const [draft, setDraft] = useState<LoyaltySettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);
  if (!draft) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.data);
  const needOk = draft.stamps_needed >= 2 && draft.stamps_needed <= 50;

  const save = async () => {
    if (!needOk || !draft.reward.trim()) return toast.error(t("Check the highlighted fields."));
    setSaving(true);
    const value = { ...draft, reward: draft.reward.trim(), stamps_needed: Math.round(draft.stamps_needed) };
    const r = await saveSetting("marketing.loyalty", value, true);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    settings.setData(() => value);
    toast.ok(t("Saved"));
  };

  return (
    <Card title={t("Stamp card settings")}>
      <div className="adm-stack">
        <Toggle
          label={t("Stamp card switched on")}
          description={draft.enabled ? t("Customers see their card in their account and can add it to Apple Wallet.") : t("Hidden from customers. Staff can still stamp cards.")}
          checked={draft.enabled}
          onChange={(v) => setDraft({ ...draft, enabled: v })}
        />
        <div className="adm-form-grid">
          <NumberField
            label={t("Stamps for a reward")}
            value={draft.stamps_needed}
            onChange={(v) => setDraft({ ...draft, stamps_needed: v ?? 0 })}
            min={2}
            max={50}
            error={needOk ? undefined : t("Between 2 and 50")}
            hint={t("Changing this applies to every card straight away.")}
          />
          <TextField
            label={t("The reward")}
            value={draft.reward}
            onChange={(v) => setDraft({ ...draft, reward: v })}
            maxLength={80}
            error={draft.reward.trim() ? undefined : t("Say what they get")}
          />
        </div>
        {dirty && (
          <div className="adm-row" style={{ justifyContent: "flex-end" }}>
            <Button onClick={() => setDraft(settings.data)}>{t("Discard")}</Button>
            <Button variant="primary" loading={saving} onClick={() => void save()}>{t("Save")}</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
