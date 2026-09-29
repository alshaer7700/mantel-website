import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLang, useT, pick } from "@/admin/i18n";
import { money } from "@/admin/lib/format";
import { BilingualField, Button, Checkbox, IconButton, MoneyField, MoveButtons, NumberField, moveInArray } from "@/admin/ui/controls";
import { Card, EmptyState, Notice } from "@/admin/ui/layout";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";
import { deleteOptionGroup, saveOptionGroup, type MenuData, type OptionGroup } from "@/admin/sections/catalog/api";

function blankGroup(): OptionGroup {
  return {
    id: "new",
    name: "",
    name_ar: "",
    min_select: 1,
    max_select: 1,
    sort_order: 0,
    choices: [],
  };
}

let tempId = 0;
const newChoiceId = () => `new-${++tempId}`;

export function OptionsPanel({ data, reload }: { data: MenuData; reload: () => Promise<void> }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<OptionGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const usedBy = (groupId: string) => data.links.filter((l) => l.group_id === groupId).length;

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error(t("Give the option a name, like “Milk”."));
    if (editing.choices.length === 0) return toast.error(t("Add at least one choice."));
    if (editing.choices.some((c) => !c.name.trim())) return toast.error(t("Every choice needs a name."));
    setSaving(true);
    const r = await saveOptionGroup({ ...editing, name: editing.name.trim(), sort_order: editing.id === "new" ? data.groups.length + 1 : editing.sort_order }, editing.id === "new");
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Options saved"));
    setEditing(null);
    await reload();
  };

  const remove = async (g: OptionGroup) => {
    const n = usedBy(g.id);
    if (!(await confirm({ title: t("Delete {name}?", { name: g.name }), body: n ? t("It's used by {n} menu items. They'll stop offering it.", { n }) : undefined, confirmLabel: t("Delete"), danger: true }))) return;
    const r = await deleteOptionGroup(g.id);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("{name} deleted", { name: g.name }));
    setEditing(null);
    await reload();
  };

  const e = editing;

  return (
    <div className="adm-stack">
      <Notice>{t("Options appear when customers order ahead on the Pick Up page, for example size, milk or an extra shot. Prices add to the item's price.")}</Notice>
      <div className="adm-spread">
        <span />
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing(blankGroup())}>{t("Add option")}</Button>
      </div>
      {data.groups.length === 0 ? (
        <EmptyState title={t("No drink options yet")} body={t("Add one, like “Milk: Full cream, Oat (+BD 0.200)”, then tick it on each drink that offers it.")} />
      ) : (
        <div className="adm-list">
          {data.groups.map((g) => (
            <button key={g.id} type="button" className="adm-list-row" onClick={() => setEditing(JSON.parse(JSON.stringify(g)) as OptionGroup)}>
              <span className="adm-list-main">
                <span className="adm-list-title">{pick(lang, g.name, g.name_ar)}</span>
                <span className="adm-list-meta">{g.choices.map((c) => pick(lang, c.name, c.name_ar) + (c.price_delta ? ` +${money(c.price_delta)}` : "")).join(" · ")}</span>
              </span>
              <span className="adm-muted adm-small">{t("{n} items", { n: usedBy(g.id) })}</span>
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={e !== null}
        onClose={() => setEditing(null)}
        title={e?.id === "new" ? t("New option") : e?.name ?? ""}
        footer={
          e && (
            <>
              {e.id !== "new" && <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => remove(e)} style={{ marginInlineEnd: "auto" }}>{t("Delete")}</Button>}
              <Button onClick={() => setEditing(null)}>{t("Cancel")}</Button>
              <Button variant="primary" loading={saving} onClick={save}>{t("Save")}</Button>
            </>
          )
        }
      >
        {e && (
          <>
            <Card>
              <BilingualField label={t("Option name")} required en={e.name} ar={e.name_ar} onEn={(v) => setEditing({ ...e, name: v })} onAr={(v) => setEditing({ ...e, name_ar: v })} maxLength={60} hint={t("What the customer is choosing, like “Size” or “Milk”.")} />
              <div className="adm-form-grid">
                <NumberField label={t("Customer must choose at least")} value={e.min_select} onChange={(v) => setEditing({ ...e, min_select: Math.max(0, Math.min(v ?? 0, e.max_select)) })} min={0} max={10} hint={t("0 means optional.")} />
                <NumberField label={t("Customer can choose up to")} value={e.max_select} onChange={(v) => setEditing({ ...e, max_select: Math.max(1, v ?? 1), min_select: Math.min(e.min_select, Math.max(1, v ?? 1)) })} min={1} max={10} />
              </div>
            </Card>
            <Card title={t("Choices")}>
              {e.choices.map((c, index) => (
                <div key={c.id} className="adm-stack" style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--a-line)" }}>
                  <div className="adm-spread">
                    <MoveButtons index={index} count={e.choices.length} label={c.name || t("choice")} onMove={(from, to) => setEditing({ ...e, choices: moveInArray(e.choices, from, to) })} />
                    <IconButton label={t("Remove choice")} onClick={() => setEditing({ ...e, choices: e.choices.filter((x) => x.id !== c.id) })}><Trash2 size={16} /></IconButton>
                  </div>
                  <BilingualField label={t("Choice")} required en={c.name} ar={c.name_ar} maxLength={60}
                    onEn={(v) => setEditing({ ...e, choices: e.choices.map((x) => (x.id === c.id ? { ...x, name: v } : x)) })}
                    onAr={(v) => setEditing({ ...e, choices: e.choices.map((x) => (x.id === c.id ? { ...x, name_ar: v } : x)) })} />
                  <div className="adm-form-grid">
                    <MoneyField label={t("Adds to the price")} value={c.price_delta} onChange={(v) => setEditing({ ...e, choices: e.choices.map((x) => (x.id === c.id ? { ...x, price_delta: v ?? 0 } : x)) })} />
                  </div>
                  <div className="adm-row">
                    <Checkbox label={t("Available")} checked={c.is_available} onChange={(v) => setEditing({ ...e, choices: e.choices.map((x) => (x.id === c.id ? { ...x, is_available: v } : x)) })} />
                    <Checkbox label={t("Chosen by default")} checked={c.is_default} onChange={(v) => setEditing({ ...e, choices: e.choices.map((x) => (x.id === c.id ? { ...x, is_default: v } : x)) })} />
                  </div>
                </div>
              ))}
              <Button icon={<Plus size={16} />} onClick={() => setEditing({ ...e, choices: [...e.choices, { id: newChoiceId(), group_id: e.id, name: "", name_ar: "", price_delta: 0, is_available: true, is_default: e.choices.length === 0, sort_order: e.choices.length + 1 }] })}>
                {t("Add a choice")}
              </Button>
            </Card>
          </>
        )}
      </Drawer>
    </div>
  );
}
