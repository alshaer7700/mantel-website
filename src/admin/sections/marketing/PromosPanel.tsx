import { useState } from "react";
import { Plus, Shuffle, Tag, Trash2 } from "lucide-react";
import { useT, type TFunction } from "@/admin/i18n";
import { db, run } from "@/admin/lib/db";
import { useAsync } from "@/admin/lib/useAsync";
import { dateTime, money } from "@/admin/lib/format";
import { Button, IconButton, MoneyField, NumberField, Segmented, TextField, Toggle } from "@/admin/ui/controls";
import { Badge, EmptyState, LoadError, Loading, Stat } from "@/admin/ui/layout";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";

/*
 * Promo codes customers type at checkout. The rules live in the database
 * (supabase/037, promo_quote): the code must be switched on, inside its
 * dates, not used up, and the order must meet its minimum. place_order works
 * the discount out itself, so what's set here is exactly what's charged.
 */

type Promo = {
  code: string;
  kind: "percent" | "amount";
  value: number;
  min_order: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  uses: number;
  once_per_customer: boolean;
  active: boolean;
  note: string;
  created_at: string;
};

const BLANK: Promo = { code: "", kind: "percent", value: 10, min_order: 0, starts_at: null, ends_at: null, max_uses: null, uses: 0, once_per_customer: false, active: true, note: "", created_at: "" };

/** Bahrain is UTC+3 all year, so a datetime-local value maps to one instant. */
const toLocal = (iso: string | null) => (iso && Number.isFinite(Date.parse(iso)) ? new Date(Date.parse(iso) + 3 * 3600_000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? `${v}:00+03:00` : null);

function offLabel(p: Pick<Promo, "kind" | "value">, t: TFunction): string {
  return p.kind === "percent" ? t("{n}% off", { n: Number(p.value) }) : t("{amount} off", { amount: money(p.value) });
}

function state(p: Promo, t: TFunction): { tone: "ok" | "warn" | "neutral" | "danger"; label: string } {
  const now = Date.now();
  if (!p.active) return { tone: "neutral", label: t("Off") };
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { tone: "neutral", label: t("Ended") };
  if (p.max_uses !== null && p.uses >= p.max_uses) return { tone: "neutral", label: t("Used up") };
  if (p.starts_at && Date.parse(p.starts_at) > now) return { tone: "warn", label: t("Scheduled") };
  return { tone: "ok", label: t("Working") };
}

function randomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `MANTEL-${Array.from(bytes, (b) => letters[b % letters.length]).join("")}`;
}

export function PromosPanel() {
  const t = useT();
  const list = useAsync(() => run<Promo[]>(db.from("promo_codes").select("*").order("created_at", { ascending: false })), []);
  const [editing, setEditing] = useState<{ promo: Promo; isNew: boolean } | null>(null);

  const rows = (list.data ?? []).map((p) => ({ ...p, value: Number(p.value), min_order: Number(p.min_order) }));
  const working = rows.filter((p) => state(p, t).tone === "ok").length;
  const totalUses = rows.reduce((s, p) => s + p.uses, 0);

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-grid-4">
        <Stat label={t("Codes working now")} value={working} />
        <Stat label={t("Times used")} value={totalUses} note={t("Across all codes")} />
      </div>
      <div className="adm-spread">
        <p className="adm-muted adm-small" style={{ margin: 0 }}>{t("Customers type the code at checkout. The discount comes off before they pay.")}</p>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing({ promo: { ...BLANK, code: randomCode() }, isNew: true })}>{t("New code")}</Button>
      </div>
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <LoadError message={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Tag size={32} />} title={t("No promo codes yet")} body={t("Make one for an event, a thank-you to regulars, or the newsletter.")} />
      ) : (
        <div className="adm-list">
          {rows.map((p) => {
            const s = state(p, t);
            return (
              <button key={p.code} type="button" className="adm-list-row" onClick={() => setEditing({ promo: p, isNew: false })}>
                <span className="adm-list-main">
                  <span className="adm-list-title adm-mono" dir="ltr" style={{ textAlign: "start" }}>{p.code}</span>
                  <span className="adm-list-meta">
                    {[
                      offLabel(p, t),
                      p.min_order > 0 ? t("orders over {amount}", { amount: money(p.min_order) }) : null,
                      p.once_per_customer ? t("once per customer") : null,
                      p.ends_at ? t("until {date}", { date: dateTime(p.ends_at) }) : null,
                    ].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="adm-list-side">
                  <span className="adm-small adm-muted">{p.max_uses !== null ? t("{n} of {max} used", { n: p.uses, max: p.max_uses }) : t("{n} used", { n: p.uses })}</span>
                  <Badge tone={s.tone === "danger" ? "danger" : s.tone} dot>{s.label}</Badge>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {editing && (
        <PromoEditor
          key={editing.promo.code || "new"}
          initial={editing.promo}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await list.reload();
          }}
        />
      )}
    </div>
  );
}

function PromoEditor({ initial, isNew, onClose, onSaved }: { initial: Promo; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [p, setP] = useState<Promo>(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Promo>) => setP({ ...p, ...patch });
  const used = initial.uses > 0;

  const codeClean = p.code.trim().toUpperCase().replace(/\s+/g, "-");
  const errors = {
    code: !/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(codeClean) ? t("3 to 24 letters, numbers or dashes") : undefined,
    value: !(p.value > 0) ? t("Enter an amount") : p.kind === "percent" && p.value > 100 ? t("At most 100%") : undefined,
    dates: p.starts_at && p.ends_at && Date.parse(p.ends_at) <= Date.parse(p.starts_at) ? t("The end is before the start") : undefined,
  };

  const save = async () => {
    if (Object.values(errors).some(Boolean)) return toast.error(t("Check the highlighted fields."));
    setSaving(true);
    const row = {
      code: codeClean,
      kind: p.kind,
      value: Math.round(p.value * 1000) / 1000,
      min_order: Math.max(0, Math.round((p.min_order || 0) * 1000) / 1000),
      starts_at: p.starts_at,
      ends_at: p.ends_at,
      max_uses: p.max_uses && p.max_uses > 0 ? Math.round(p.max_uses) : null,
      once_per_customer: p.once_per_customer,
      active: p.active,
      note: p.note.trim(),
    };
    const r = isNew
      ? await run(db.from("promo_codes").insert(row))
      : await run(db.from("promo_codes").update(row).eq("code", initial.code));
    setSaving(false);
    if (!r.ok) return toast.error(r.error.includes("duplicate") ? t("That code already exists.") : r.error);
    toast.ok(isNew ? t("Code {code} is ready", { code: codeClean }) : t("Saved"));
    onSaved();
  };

  const remove = async () => {
    if (!(await confirm({ title: t("Delete {code}?", { code: initial.code }), confirmLabel: t("Delete"), danger: true }))) return;
    const r = await run(db.from("promo_codes").delete().eq("code", initial.code));
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Deleted"));
    onSaved();
  };

  return (
    <Drawer
      open
      title={isNew ? t("New promo code") : initial.code}
      onClose={onClose}
      footer={(
        <>
          {!isNew && !used && <IconButton label={t("Delete")} onClick={remove}><Trash2 size={16} /></IconButton>}
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" onClick={save} loading={saving}>{isNew ? t("Create code") : t("Save")}</Button>
        </>
      )}
    >
      <div className="adm-stack">
        <div className="adm-row" style={{ alignItems: "flex-end", flexWrap: "nowrap" }}>
          <div style={{ flex: 1 }}>
            <TextField
              label={t("Code")}
              value={p.code}
              onChange={(v) => set({ code: v.toUpperCase() })}
              maxLength={24}
              dir="ltr"
              disabled={used}
              error={errors.code}
              hint={used ? t("Used codes can't be renamed.") : t("What customers type. Capitals don't matter.")}
            />
          </div>
          {!used && <IconButton label={t("Make one up")} onClick={() => set({ code: randomCode() })} style={{ marginBottom: 26 }}><Shuffle size={16} /></IconButton>}
        </div>
        <Segmented
          label={t("Discount type")}
          value={p.kind}
          onChange={(kind) => set({ kind })}
          options={[
            { value: "percent", label: t("% off") },
            { value: "amount", label: t("BD off") },
          ]}
        />
        <div className="adm-form-grid">
          {p.kind === "percent" ? (
            <NumberField label={t("Percent off")} value={p.value} onChange={(v) => set({ value: v ?? 0 })} prefix="%" min={1} max={100} error={errors.value} />
          ) : (
            <MoneyField label={t("Amount off")} value={p.value} onChange={(v) => set({ value: v ?? 0 })} min={0} error={errors.value} />
          )}
          <MoneyField label={t("Minimum order")} value={p.min_order} onChange={(v) => set({ min_order: v ?? 0 })} min={0} hint={t("0 means no minimum.")} />
        </div>
        <div className="adm-form-grid">
          <TextField label={t("Starts")} optional type="datetime-local" value={toLocal(p.starts_at)} onChange={(v) => set({ starts_at: fromLocal(v) })} hint={t("Blank: straight away")} />
          <TextField label={t("Ends")} optional type="datetime-local" value={toLocal(p.ends_at)} onChange={(v) => set({ ends_at: fromLocal(v) })} hint={t("Blank: until you switch it off")} error={errors.dates} />
        </div>
        <NumberField label={t("How many times it can be used")} optional value={p.max_uses} onChange={(v) => set({ max_uses: v })} min={1} placeholder={t("No limit")} hint={used ? t("Used {n} times so far.", { n: initial.uses }) : undefined} />
        <Toggle label={t("Once per customer")} description={t("Checked by email address.")} checked={p.once_per_customer} onChange={(v) => set({ once_per_customer: v })} />
        <Toggle label={t("Switched on")} description={p.active ? t("Customers can use it (within its dates).") : t("Nobody can use it until you switch it back on.")} checked={p.active} onChange={(v) => set({ active: v })} />
        <TextField label={t("Note for staff")} optional value={p.note} onChange={(v) => set({ note: v })} maxLength={200} placeholder={t("e.g. For the October newsletter")} />
        {!isNew && <p className="adm-small adm-muted">{t("Made {date}", { date: dateTime(initial.created_at) })}</p>}
      </div>
    </Drawer>
  );
}
