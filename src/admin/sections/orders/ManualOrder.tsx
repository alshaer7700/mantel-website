import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAsync } from "@/admin/lib/useAsync";
import { money } from "@/admin/lib/format";
import { run, db, type Result } from "@/admin/lib/db";
import { Button, IconButton, SearchInput, Segmented, TextArea, TextField } from "@/admin/ui/controls";
import { LoadError, Loading } from "@/admin/ui/layout";
import { Modal, useToast } from "@/admin/ui/overlays";
import { createManualOrder } from "@/admin/sections/orders/api";

type Sellable = { id: string; name: string; price: number; kind: "menu" | "object"; hidden: boolean };

async function loadSellables(): Promise<Result<Sellable[]>> {
  const [menu, objects] = await Promise.all([
    run<{ id: string; name: string; price: number | string; is_available: boolean }[]>(
      db.from("menu_items").select("id, name, price, is_available").is("archived_at", null).order("category").order("sort_order"),
    ),
    run<{ id: string; name: string; price: number | string; is_available: boolean }[]>(
      db.from("objects").select("id, name, price, is_available").is("archived_at", null).order("sort_order"),
    ),
  ]);
  if (!menu.ok) return menu;
  if (!objects.ok) return objects;
  return {
    ok: true,
    value: [
      ...(menu.value ?? []).map((m) => ({ id: m.id, name: m.name, price: Number(m.price), kind: "menu" as const, hidden: !m.is_available })),
      ...(objects.value ?? []).map((o) => ({ id: o.id, name: o.name, price: Number(o.price), kind: "object" as const, hidden: !o.is_available })),
    ].filter((s) => s.price > 0),
  };
}

export function ManualOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const t = useT();
  const toast = useToast();
  const items = useAsync(loadSellables, [open]);
  const [source, setSource] = useState<"walk-in" | "phone">("walk-in");
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items.data ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [items.data, query]);

  const chosen = (items.data ?? []).filter((s) => (qty[s.id] ?? 0) > 0);
  const total = chosen.reduce((sum, s) => sum + s.price * (qty[s.id] ?? 0), 0);

  const change = (id: string, delta: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(99, (q[id] ?? 0) + delta)) }));

  const reset = () => {
    setQty({});
    setName("");
    setPhone("");
    setEmail("");
    setNote("");
    setQuery("");
  };

  const save = async () => {
    if (chosen.length === 0) return toast.error(t("Add at least one item."));
    if (source === "phone" && !name.trim()) return toast.error(t("Add the customer's name so the counter can call it out."));
    setBusy(true);
    const r = await createManualOrder({
      items: chosen.map((s) => ({ id: s.id, qty: qty[s.id] ?? 1 })),
      name: name.trim() || (source === "walk-in" ? "Walk-in" : ""),
      phone,
      email,
      note,
      source,
      status: source === "walk-in" ? "completed" : "received",
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(source === "walk-in" ? t("Sale recorded") : t("Order added to the board"));
    reset();
    onCreated(r.value);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Add an order by hand")}
      wide
      footer={
        <>
          <span className="adm-strong adm-num" style={{ marginInlineEnd: "auto", fontSize: 20 }}>{money(total)}</span>
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" loading={busy} onClick={save}>{source === "walk-in" ? t("Record sale") : t("Add to the board")}</Button>
        </>
      }
    >
      <Segmented
        label={t("Type of order")}
        value={source}
        onChange={setSource}
        options={[
          { value: "walk-in", label: t("Walk-in, already paid") },
          { value: "phone", label: t("Phone order, to prepare") },
        ]}
      />
      <p className="adm-small adm-muted">
        {source === "walk-in"
          ? t("Recorded as collected, so it counts in the day's sales and reports.")
          : t("Goes onto the live board as a new order, like one from the website.")}
      </p>
      <SearchInput value={query} onChange={setQuery} placeholder={t("Find an item")} />
      {items.loading && !items.data ? (
        <Loading />
      ) : items.error ? (
        <LoadError message={items.error} onRetry={items.reload} />
      ) : (
        <div className="adm-list" style={{ maxHeight: 300, overflow: "auto" }}>
          {list.map((s) => (
            <div key={s.id} className="adm-list-row" style={{ minHeight: 52 }}>
              <span className="adm-list-main">
                <span className="adm-list-title">{s.name}</span>
                <span className="adm-list-meta">{money(s.price)}{s.hidden ? ` · ${t("hidden on the website")}` : ""}</span>
              </span>
              <span className="adm-list-side">
                <IconButton label={t("One less {name}", { name: s.name })} onClick={() => change(s.id, -1)} disabled={!qty[s.id]}><Minus size={16} /></IconButton>
                <span className="adm-num adm-strong" style={{ width: 24, textAlign: "center" }}>{qty[s.id] ?? 0}</span>
                <IconButton label={t("One more {name}", { name: s.name })} onClick={() => change(s.id, 1)}><Plus size={16} /></IconButton>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="adm-form-grid">
        <TextField label={t("Customer name")} optional={source === "walk-in"} value={name} onChange={setName} maxLength={120} />
        <TextField label={t("Phone")} optional value={phone} onChange={setPhone} inputMode="tel" dir="ltr" maxLength={24} />
        <TextField label={t("Email")} optional value={email} onChange={setEmail} type="email" dir="ltr" maxLength={254} />
      </div>
      <TextArea label={t("Note")} optional value={note} onChange={setNote} rows={2} maxLength={500} />
    </Modal>
  );
}
