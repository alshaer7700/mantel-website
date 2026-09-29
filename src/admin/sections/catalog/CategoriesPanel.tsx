import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useT } from "@/admin/i18n";
import { slugify } from "@/admin/lib/format";
import { BilingualField, Button, IconButton, MoveButtons, Toggle, moveInArray } from "@/admin/ui/controls";
import { Notice } from "@/admin/ui/layout";
import { Modal, useConfirm, useToast } from "@/admin/ui/overlays";
import { deleteCategory, reorderCategories, saveCategory, type Category, type MenuData } from "@/admin/sections/catalog/api";

export function CategoriesPanel({ data, reload }: { data: MenuData; reload: () => Promise<void> }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ cat: Category; isNew: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = new Map<string, number>();
  for (const i of data.items) if (!i.archived_at) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);

  const move = async (from: number, to: number) => {
    const next = moveInArray(data.categories, from, to);
    const r = await reorderCategories(next.map((c) => c.slug));
    if (!r.ok) return toast.error(r.error);
    await reload();
  };

  const toggle = async (cat: Category, visible: boolean) => {
    const r = await saveCategory({ ...cat, is_visible: visible }, false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(visible ? t("{name} is on the menu", { name: cat.label }) : t("{name} is hidden from the menu", { name: cat.label }));
    await reload();
  };

  const remove = async (cat: Category) => {
    if ((counts.get(cat.slug) ?? 0) > 0) {
      toast.error(t("Move or archive the items in {name} first.", { name: cat.label }));
      return;
    }
    if (!(await confirm({ title: t("Delete {name}?", { name: cat.label }), confirmLabel: t("Delete"), danger: true }))) return;
    const r = await deleteCategory(cat.slug);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("{name} deleted", { name: cat.label }));
    await reload();
  };

  const save = async () => {
    if (!editing) return;
    const cat = editing.cat;
    if (!cat.label.trim()) return toast.error(t("Give the category a name."));
    const slug = editing.isNew ? slugify(cat.label) : cat.slug;
    if (!slug) return toast.error(t("Use at least one English letter or number in the name."));
    setSaving(true);
    const r = await saveCategory({ ...cat, slug, label: cat.label.trim(), label_ar: cat.label_ar.trim(), sort_order: editing.isNew ? data.categories.length + 1 : cat.sort_order }, editing.isNew);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Category saved"));
    setEditing(null);
    await reload();
  };

  return (
    <div className="adm-stack">
      <div className="adm-spread">
        <p className="adm-muted">{t("The headings on the Menu page, in this order.")}</p>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing({ cat: { slug: "", label: "", label_ar: "", sort_order: 0, is_visible: true }, isNew: true })}>{t("Add category")}</Button>
      </div>
      <div className="adm-list">
        {data.categories.map((c, index) => (
          <div key={c.slug} className="adm-list-row">
            <MoveButtons index={index} count={data.categories.length} label={c.label} onMove={move} />
            <button type="button" className="adm-list-main" style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0, display: "grid", gap: 2 }} onClick={() => setEditing({ cat: c, isNew: false })}>
              <span className="adm-list-title">{c.label}{c.label_ar && <span className="adm-muted" dir="rtl"> · {c.label_ar}</span>}</span>
              <span className="adm-list-meta">{t("{n} items", { n: counts.get(c.slug) ?? 0 })} · bymantel.com/menu/{c.slug}</span>
            </button>
            <span className="adm-list-side">
              <Toggle label={<span className="sr-only">{t("Show on menu")}</span>} checked={c.is_visible} onChange={(v) => toggle(c, v)} />
              <IconButton label={t("Delete")} onClick={() => remove(c)}><Trash2 size={16} /></IconButton>
            </span>
          </div>
        ))}
      </div>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.isNew ? t("New category") : t("Edit category")}
        footer={<><Button onClick={() => setEditing(null)}>{t("Cancel")}</Button><Button variant="primary" loading={saving} onClick={save}>{t("Save")}</Button></>}
      >
        {editing && (
          <>
            <BilingualField
              label={t("Name")}
              required
              en={editing.cat.label}
              ar={editing.cat.label_ar}
              onEn={(v) => setEditing({ ...editing, cat: { ...editing.cat, label: v } })}
              onAr={(v) => setEditing({ ...editing, cat: { ...editing.cat, label_ar: v } })}
              maxLength={60}
            />
            {editing.isNew ? (
              <p className="adm-hint">{t("Web address: bymantel.com/menu/{slug}", { slug: slugify(editing.cat.label) || "…" })}</p>
            ) : (
              <Notice>{t("Renaming keeps the same web address, so shared links keep working.")}</Notice>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
