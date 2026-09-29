import { useEffect, useMemo, useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { useLang, useT, pick } from "@/admin/i18n";
import { money } from "@/admin/lib/format";
import { useUnsavedGuard } from "@/admin/lib/useAsync";
import { BilingualField, Button, Checkbox, MoneyField, MultiChips, NumberField, SelectField, Toggle } from "@/admin/ui/controls";
import { Card, Notice } from "@/admin/ui/layout";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";
import { ImagePicker } from "@/admin/ui/ImagePicker";
import {
  ALLERGENS,
  BADGES,
  DIET,
  deleteMenuItem,
  saveMenuItem,
  setItemOptions,
  setSoldOut,
  type MenuData,
  type MenuItemRow,
} from "@/admin/sections/catalog/api";

type Draft = Omit<MenuItemRow, "id" | "updated_at" | "archived_at" | "sold_out_until" | "sort_order">;

function emptyDraft(category: string): Draft {
  return {
    name: "", name_ar: "", description: "", description_ar: "", price: 0, category, image_url: null, is_available: false,
    ingredients: null, ingredients_ar: null, calories: null, protein_g: null, carbs_g: null, fat_g: null,
    badges: [], allergens: [], diet: [], available_from: null, available_until: null, available_start: null, available_end: null,
  };
}

function toDraft(i: MenuItemRow): Draft {
  const { id: _id, updated_at: _u, archived_at: _a, sold_out_until: _s, sort_order: _o, ...rest } = i;
  void _id; void _u; void _a; void _s; void _o;
  return rest;
}

export function MenuItemEditor({ open, itemId, data, onClose, onSaved }: { open: boolean; itemId: string | null; data: MenuData; onClose: () => void; onSaved: (id: string | null) => void }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const item = itemId ? data.items.find((i) => i.id === itemId) ?? null : null;
  const firstCategory = data.categories[0]?.slug ?? "coffee";
  const [draft, setDraft] = useState<Draft>(() => (item ? toDraft(item) : emptyDraft(firstCategory)));
  const [groups, setGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const originalGroups = useMemo(
    () => (item ? data.links.filter((l) => l.menu_item_id === item.id).sort((a, b) => a.sort_order - b.sort_order).map((l) => l.group_id) : []),
    [item, data.links],
  );

  useEffect(() => {
    if (!open) return;
    setDraft(item ? toDraft(item) : emptyDraft(firstCategory));
    setGroups(originalGroups);
    setErrors({});
    setScheduleOpen(Boolean(item?.available_from || item?.available_until || item?.available_start || item?.available_end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  const original = item ? toDraft(item) : emptyDraft(firstCategory);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original) || JSON.stringify(groups) !== JSON.stringify(originalGroups);
  useUnsavedGuard(open && dirty);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const close = async () => {
    if (dirty && !(await confirm({ title: t("Leave without saving?"), body: t("Your changes to this item will be lost."), confirmLabel: t("Leave"), danger: true }))) return;
    onClose();
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = t("Give the item a name.");
    if (draft.price < 0) next.price = t("The price can't be below zero.");
    if (draft.is_available && draft.price <= 0) next.price = t("An item needs a price above zero to show on the website.");
    if (draft.available_start && !draft.available_end) next.schedule = t("Add an end time too, or clear both.");
    if (!draft.available_start && draft.available_end) next.schedule = t("Add a start time too, or clear both.");
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    const r = await saveMenuItem({
      ...(item ? { id: item.id } : { sort_order: (data.items.filter((i) => i.category === draft.category).reduce((m, i) => Math.max(m, i.sort_order), 0) || 0) + 1 }),
      ...draft,
      name: draft.name.trim(),
      name_ar: draft.name_ar.trim(),
      description: draft.description.trim(),
      description_ar: draft.description_ar.trim(),
      ingredients: draft.ingredients?.trim() || null,
      ingredients_ar: draft.ingredients_ar?.trim() || null,
    });
    if (!r.ok) {
      setSaving(false);
      return toast.error(r.error);
    }
    if (JSON.stringify(groups) !== JSON.stringify(originalGroups)) {
      const o = await setItemOptions(r.value.id, groups);
      if (!o.ok) toast.error(o.error);
    }
    setSaving(false);
    toast.ok(item ? t("{name} saved", { name: r.value.name }) : t("{name} added", { name: r.value.name }));
    onSaved(r.value.id);
    if (item) onClose();
  };

  const soldOut = Boolean(item?.sold_out_until && new Date(item.sold_out_until).getTime() > Date.now());

  const remove = async () => {
    if (!item) return;
    const archive = await confirm({
      title: t("Remove {name}?", { name: item.name }),
      body: t("Archiving hides it everywhere but keeps it so you can bring it back. Past orders are never affected."),
      confirmLabel: t("Archive"),
      cancelLabel: t("Cancel"),
    });
    if (!archive) return;
    const r = await saveMenuItem({ id: item.id, archived_at: new Date().toISOString() });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("{name} archived", { name: item.name }));
    onSaved(null);
    onClose();
  };

  const deleteForGood = async () => {
    if (!item) return;
    const ok = await confirm({ title: t("Delete {name} for good?", { name: item.name }), body: t("This can't be undone."), confirmLabel: t("Delete for good"), danger: true, typeToConfirm: "delete" });
    if (!ok) return;
    const r = await deleteMenuItem(item.id);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("{name} deleted", { name: item.name }));
    onSaved(null);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      wide
      title={item ? pick(lang, item.name, item.name_ar) : t("New menu item")}
      footer={
        <>
          {item && !item.archived_at && <Button variant="ghost" icon={<Archive size={16} />} onClick={remove} style={{ marginInlineEnd: "auto" }}>{t("Archive")}</Button>}
          {item?.archived_at && <Button variant="danger" icon={<Trash2 size={16} />} onClick={deleteForGood} style={{ marginInlineEnd: "auto" }}>{t("Delete for good")}</Button>}
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button variant="primary" loading={saving} onClick={save} disabled={item ? !dirty : false}>{item ? t("Save changes") : t("Add item")}</Button>
        </>
      }
    >
      {item?.archived_at && <Notice tone="warn" title={t("This item is archived")}>{t("It's hidden everywhere. Use Restore on the menu list to bring it back.")}</Notice>}

      <Card title={t("The basics")}>
        <div className="adm-form-grid">
          <BilingualField label={t("Name")} required en={draft.name} ar={draft.name_ar} onEn={(v) => set("name", v)} onAr={(v) => set("name_ar", v)} error={errors.name} maxLength={80} />
          <SelectField label={t("Category")} value={draft.category} onChange={(v) => set("category", v)} options={data.categories.map((c) => ({ value: c.slug, label: pick(lang, c.label, c.label_ar) }))} />
          <MoneyField label={t("Price")} value={draft.price} onChange={(v) => set("price", v ?? 0)} error={errors.price} />
          <BilingualField label={t("Short description")} en={draft.description} ar={draft.description_ar} onEn={(v) => set("description", v)} onAr={(v) => set("description_ar", v)} multiline rows={2} maxLength={300} />
        </div>
      </Card>

      <Card title={t("On the website")}>
        <Toggle
          label={t("Show on the website")}
          description={draft.is_available ? t("Customers can see it on the menu.") : t("Hidden. Only the team can see it here.")}
          checked={draft.is_available}
          onChange={(v) => set("is_available", v)}
        />
        {item && (
          <Toggle
            label={t("Sold out today")}
            description={t("Hides it until 4am tomorrow, then it comes back by itself.")}
            checked={soldOut}
            onChange={async (v) => {
              const r = await setSoldOut("menu", item.id, v);
              if (!r.ok) return toast.error(r.error);
              toast.ok(v ? t("Sold out until tomorrow morning") : t("Back on sale"));
              onSaved(item.id);
            }}
          />
        )}
        <Checkbox label={t("Only show it on certain dates or at certain times")} checked={scheduleOpen} onChange={(v) => {
          setScheduleOpen(v);
          if (!v) setDraft((d) => ({ ...d, available_from: null, available_until: null, available_start: null, available_end: null }));
        }} />
        {scheduleOpen && (
          <div className="adm-form-grid">
            <label className="adm-field"><span className="adm-label">{t("From date")}</span><input type="date" className="adm-input" value={draft.available_from ?? ""} onChange={(e) => set("available_from", e.target.value || null)} /></label>
            <label className="adm-field"><span className="adm-label">{t("Until date")}</span><input type="date" className="adm-input" value={draft.available_until ?? ""} onChange={(e) => set("available_until", e.target.value || null)} /></label>
            <label className="adm-field"><span className="adm-label">{t("Each day from")}</span><input type="time" className="adm-input" value={draft.available_start?.slice(0, 5) ?? ""} onChange={(e) => set("available_start", e.target.value || null)} /></label>
            <label className="adm-field"><span className="adm-label">{t("Each day until")}</span><input type="time" className="adm-input" value={draft.available_end?.slice(0, 5) ?? ""} onChange={(e) => set("available_end", e.target.value || null)} /></label>
            <p className="adm-hint adm-span-2">{t("For seasonal drinks or breakfast-only food. Leave any box empty to not limit it. Times are Bahrain time.")}</p>
            {errors.schedule && <p className="adm-error adm-span-2">{errors.schedule}</p>}
          </div>
        )}
      </Card>

      <Card title={t("Photo")}>
        <ImagePicker label={t("Menu photo")} value={draft.image_url} onChange={(url) => set("image_url", url)} folder="menu" hint={t("A square photo works best. It's resized automatically.")} />
      </Card>

      <Card title={t("Labels and allergens")} subtitle={t("Help customers choose, and keep people with allergies safe.")}>
        <div className="adm-field"><span className="adm-label">{t("Labels")}</span><MultiChips label={t("Labels")} value={draft.badges} onChange={(v) => set("badges", v)} options={BADGES.map((b) => ({ ...b, label: t(b.label) }))} /></div>
        <div className="adm-field"><span className="adm-label">{t("Contains")}</span><MultiChips label={t("Contains")} value={draft.allergens} onChange={(v) => set("allergens", v)} options={ALLERGENS.map((b) => ({ ...b, label: t(b.label) }))} /></div>
        <div className="adm-field"><span className="adm-label">{t("Suitable for")}</span><MultiChips label={t("Suitable for")} value={draft.diet} onChange={(v) => set("diet", v)} options={DIET.map((b) => ({ ...b, label: t(b.label) }))} /></div>
      </Card>

      <Card title={t("Ingredients and nutrition")} subtitle={t("Leave a box empty if you don't know it. Empty is never shown as zero.")}>
        <BilingualField label={t("Ingredients")} en={draft.ingredients ?? ""} ar={draft.ingredients_ar ?? ""} onEn={(v) => set("ingredients", v)} onAr={(v) => set("ingredients_ar", v)} multiline rows={2} maxLength={500} />
        <div className="adm-grid-4">
          <NumberField label={t("Calories")} value={draft.calories} onChange={(v) => set("calories", v === null ? null : Math.round(v))} min={0} max={2000} optional />
          <NumberField label={t("Protein (g)")} value={draft.protein_g} onChange={(v) => set("protein_g", v)} min={0} max={200} optional />
          <NumberField label={t("Carbs (g)")} value={draft.carbs_g} onChange={(v) => set("carbs_g", v)} min={0} max={200} optional />
          <NumberField label={t("Fat (g)")} value={draft.fat_g} onChange={(v) => set("fat_g", v)} min={0} max={200} optional />
        </div>
      </Card>

      <Card title={t("Drink options")} subtitle={t("Choices customers pick when they order, like size or milk. Manage the list under the Drink options tab.")}>
        {data.groups.length === 0 ? (
          <p className="adm-muted">{t("No options yet. Create them under Menu → Drink options.")}</p>
        ) : (
          <div className="adm-stack" style={{ gap: 6 }}>
            {data.groups.map((g) => (
              <Checkbox
                key={g.id}
                label={<span>{pick(lang, g.name, g.name_ar)} <span className="adm-muted adm-small">— {g.choices.map((c) => pick(lang, c.name, c.name_ar) + (c.price_delta ? ` (+${money(c.price_delta)})` : "")).join(", ")}</span></span>}
                checked={groups.includes(g.id)}
                onChange={(v) => setGroups((cur) => (v ? [...cur, g.id] : cur.filter((x) => x !== g.id)))}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title={t("Preview")} subtitle={t("Roughly how it reads on the menu.")}>
        <div className="adm-preview">
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 20, margin: 0 }}>{(lang === "ar" && draft.name_ar) || draft.name || t("Item name")}</p>
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, margin: "2px 0 0", color: "#8C867D" }}>{draft.price.toFixed(3)}</p>
          {draft.badges.length > 0 && <p style={{ fontFamily: "var(--a-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 6 }}>{draft.badges.map((b) => t(BADGES.find((x) => x.value === b)?.label ?? b)).join(" · ")}</p>}
        </div>
      </Card>
    </Drawer>
  );
}
