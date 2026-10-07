import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Copy, ListOrdered, Percent, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { StylePicker } from "@/admin/ui/StylePicker";
import type { TextStyle } from "@/lib/content/pages";
import { Spin360 } from "@/app/components/objects/Spin360";
import { useLang, useT, pick } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync, useUnsavedGuard } from "@/admin/lib/useAsync";
import { money, slugify } from "@/admin/lib/format";
import { BilingualField, Button, Chips, IconButton, MoneyField, MoveButtons, MultiChips, NumberField, SearchInput, TextField, Toggle, moveInArray } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader } from "@/admin/ui/layout";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";
import { GalleryPicker } from "@/admin/ui/ImagePicker";
import { RETAIL_PRODUCTS } from "@/app/content/retail";
import {
  BADGES,
  STATUS_LABEL,
  deleteObject,
  duplicateItem,
  itemStatus,
  loadObjects,
  reorder,
  saveObject,
  setSoldOut,
  type ObjectRow,
} from "@/admin/sections/catalog/api";
import { BulkPriceModal } from "@/admin/sections/catalog/BulkPrice";

/* The photographs that ship with the site, by product slug. */
const BUILT_IN: Record<string, readonly string[]> = Object.fromEntries(
  RETAIL_PRODUCTS.map((p) => [p.id, p.images ?? [p.image]]),
);

type Filter = "all" | "live" | "hidden" | "low" | "archived";

export function RetailSection() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const { rest, navigate, refreshCounts } = useAdmin();
  const objects = useAsync(loadObjects, []);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [ordering, setOrdering] = useState<ObjectRow[] | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const editing = rest[0] ?? null;

  const rows = objects.data ?? [];
  const isLow = (o: ObjectRow) => o.stock_qty !== null && o.stock_qty <= o.low_stock_at && !o.archived_at;

  const list = useMemo(() => rows.filter((o) => {
    const s = itemStatus(o);
    if (filter === "all" && s === "archived") return false;
    if (filter === "live" && s !== "live") return false;
    if (filter === "hidden" && s !== "hidden") return false;
    if (filter === "low" && !isLow(o)) return false;
    if (filter === "archived" && s !== "archived") return false;
    const q = query.trim().toLowerCase();
    return !q || `${o.name} ${o.name_ar}`.toLowerCase().includes(q);
  }), [rows, filter, query]);

  const patch = (id: string, p: Partial<ObjectRow>) => objects.setData((all) => (all ?? []).map((o) => (o.id === id ? { ...o, ...p } : o)));

  const toggle = async (o: ObjectRow, v: boolean) => {
    if (v && o.price <= 0) return toast.error(t("Give {name} a price before showing it on the website.", { name: o.name }));
    patch(o.id, { is_available: v });
    const r = await saveObject({ id: o.id, is_available: v });
    if (!r.ok) {
      patch(o.id, { is_available: !v });
      return toast.error(r.error);
    }
    toast.ok(v ? t("{name} is on the website", { name: o.name }) : t("{name} is hidden", { name: o.name }), async () => {
      patch(o.id, { is_available: !v });
      await saveObject({ id: o.id, is_available: !v });
    });
  };

  const archive = async (o: ObjectRow, archived: boolean) => {
    const r = await saveObject({ id: o.id, archived_at: archived ? new Date().toISOString() : null });
    if (!r.ok) return toast.error(r.error);
    await objects.reload();
    toast.ok(archived ? t("{name} archived", { name: o.name }) : t("{name} restored", { name: o.name }));
  };

  const remove = async (o: ObjectRow) => {
    if (!(await confirm({ title: t("Delete {name} for good?", { name: o.name }), body: t("This can't be undone."), confirmLabel: t("Delete for good"), danger: true, typeToConfirm: "delete" }))) return;
    const r = await deleteObject(o.id);
    if (!r.ok) return toast.error(r.error);
    await objects.reload();
    toast.ok(t("{name} deleted", { name: o.name }));
  };

  return (
    <>
      <PageHeader
        overline={t("Retail / small editions")}
        title={t("Retail shop.")}
        subtitle={t("The objects on the Retail page. Photos, prices, stock and the words on each product page.")}
        actions={
          <>
            <Button icon={<Percent size={16} />} onClick={() => setBulkOpen(true)} disabled={!rows.length}>{t("Change prices")}</Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate("retail", "new")}>{t("Add product")}</Button>
          </>
        }
      />
      {objects.loading && !objects.data ? (
        <Loading />
      ) : objects.error ? (
        <LoadError message={objects.error} onRetry={objects.reload} />
      ) : ordering ? (
        <div className="adm-stack">
          <div className="adm-spread">
            <p className="adm-muted">{t("Use the arrows to set the order on the Retail page.")}</p>
            <div className="adm-actions">
              <Button onClick={() => setOrdering(null)}>{t("Cancel")}</Button>
              <Button variant="primary" onClick={async () => {
                const r = await reorder("object", ordering.map((o) => o.id));
                if (!r.ok) return toast.error(r.error);
                setOrdering(null);
                await objects.reload();
                toast.ok(t("New order saved"));
              }}>{t("Save order")}</Button>
            </div>
          </div>
          <div className="adm-list">
            {ordering.map((o, i) => (
              <div key={o.id} className="adm-list-row">
                <span className="adm-num adm-muted" style={{ width: 24 }}>{i + 1}</span>
                <span className="adm-list-main"><span className="adm-list-title">{o.name}</span></span>
                <MoveButtons index={i} count={ordering.length} label={o.name} onMove={(from, to) => setOrdering(moveInArray(ordering, from, to))} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="adm-stack">
          <div className="adm-spread">
            <Chips<Filter>
              label={t("Show")}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: t("All") },
                { value: "live", label: t("On the website") },
                { value: "hidden", label: t("Hidden") },
                { value: "low", label: t("Low stock"), count: rows.filter(isLow).length },
                { value: "archived", label: t("Archived") },
              ]}
            />
            <div className="adm-row">
              <SearchInput value={query} onChange={setQuery} placeholder={t("Search products")} />
              <Button size="sm" variant="ghost" icon={<ListOrdered size={16} />} onClick={() => setOrdering(rows.filter((o) => !o.archived_at))}>{t("Change order")}</Button>
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState icon={<ShoppingBag size={32} />} title={t("Nothing matches")} />
          ) : (
            <div className="adm-list">
              {list.map((o) => {
                const s = itemStatus(o);
                const photo = o.images[0] ?? o.image_url ?? BUILT_IN[o.slug]?.[0] ?? null;
                return (
                  <div key={o.id} className="adm-list-row">
                    <button type="button" onClick={() => navigate("retail", o.id)} className="adm-row" style={{ flex: 1, minWidth: 0, border: 0, background: "none", padding: 0, textAlign: "start", cursor: "pointer", color: "inherit", flexWrap: "nowrap" }}>
                      {photo ? <img className="adm-thumb" src={photo} alt="" style={{ objectFit: "contain", background: "var(--a-surface)" }} /> : <span className="adm-thumb"><ShoppingBag size={18} /></span>}
                      <span className="adm-list-main">
                        <span className="adm-list-title">{pick(lang, o.name, o.name_ar)}</span>
                        <span className="adm-list-meta">
                          <span className="adm-num">{money(o.price)}</span>
                          {o.stock_qty !== null && <> · <span style={isLow(o) ? { color: "var(--a-brand)", fontWeight: 600 } : undefined}>{t("{n} in stock", { n: o.stock_qty })}</span></>}
                        </span>
                      </span>
                    </button>
                    <span className="adm-list-side">
                      <Badge tone={STATUS_LABEL[s].tone}>{t(STATUS_LABEL[s].label)}</Badge>
                      {s !== "archived" ? (
                        <>
                          <Toggle label={<span className="sr-only">{t("Show on website")}</span>} checked={o.is_available} onChange={(v) => toggle(o, v)} />
                          <IconButton label={t("Duplicate")} onClick={async () => { const r = await duplicateItem("object", o.id); if (!r.ok) return toast.error(r.error); await objects.reload(); navigate("retail", r.value); }}><Copy size={16} /></IconButton>
                          <IconButton label={t("Archive")} onClick={() => archive(o, true)}><Archive size={16} /></IconButton>
                        </>
                      ) : (
                        <>
                          <Button size="sm" icon={<ArchiveRestore size={16} />} onClick={() => archive(o, false)}>{t("Restore")}</Button>
                          <IconButton label={t("Delete for good")} onClick={() => remove(o)}><Trash2 size={16} /></IconButton>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {objects.data && (
        <>
          <ObjectEditor
            open={editing !== null}
            item={editing && editing !== "new" ? objects.data.find((o) => o.id === editing) ?? null : null}
            nextSort={objects.data.reduce((m, o) => Math.max(m, o.sort_order), 0) + 1}
            onClose={() => navigate("retail")}
            onSaved={async (id) => {
              await objects.reload();
              refreshCounts();
              if (editing === "new" && id) navigate("retail", id);
            }}
          />
          <BulkPriceModal open={bulkOpen} onClose={() => setBulkOpen(false)} kind="object" items={objects.data} onDone={objects.reload} />
        </>
      )}
    </>
  );
}

type Draft = Omit<ObjectRow, "id" | "updated_at" | "archived_at" | "sold_out_until" | "sort_order">;

const EMPTY: Draft = {
  slug: "", name: "", name_ar: "", spec: "", spec_ar: "", description: "", description_ar: "",
  story: "", story_ar: "", care: "", care_ar: "", collection: "", collection_ar: "",
  price: 0, image_url: null, images: [], spin_images: [], text_styles: {}, art_key: null, is_available: false,
  stock_qty: null, low_stock_at: 3, badges: [],
};

function toDraft(o: ObjectRow): Draft {
  const { id: _i, updated_at: _u, archived_at: _a, sold_out_until: _s, sort_order: _o, ...rest } = o;
  void _i; void _u; void _a; void _s; void _o;
  return rest;
}

function ObjectEditor({ open, item, nextSort, onClose, onSaved }: { open: boolean; item: ObjectRow | null; nextSort: number; onClose: () => void; onSaved: (id: string | null) => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDraft(item ? toDraft(item) : EMPTY);
    setSlugTouched(Boolean(item));
    setErrors({});
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const original = item ? toDraft(item) : EMPTY;
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  useUnsavedGuard(open && dirty);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setStyle = (field: string, s: TextStyle | undefined) => setDraft((d) => {
    const next = { ...d.text_styles };
    if (s && (s.font || s.size)) next[field] = s;
    else delete next[field];
    return { ...d, text_styles: next };
  });

  const close = async () => {
    if (dirty && !(await confirm({ title: t("Leave without saving?"), body: t("Your changes to this product will be lost."), confirmLabel: t("Leave"), danger: true }))) return;
    onClose();
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = t("Give the product a name.");
    const slug = draft.slug || slugify(draft.name);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) e.slug = t("Use lowercase English letters, numbers and dashes.");
    if (draft.is_available && draft.price <= 0) e.price = t("A product needs a price above zero to show on the website.");
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const r = await saveObject({
      ...(item ? { id: item.id } : { sort_order: nextSort }),
      ...draft,
      slug,
      name: draft.name.trim(),
      image_url: draft.images[0] ?? draft.image_url,
    });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(item ? t("{name} saved", { name: r.value.name }) : t("{name} added", { name: r.value.name }));
    onSaved(r.value.id);
    if (item) onClose();
  };

  const soldOut = Boolean(item?.sold_out_until && new Date(item.sold_out_until).getTime() > Date.now());

  return (
    <Drawer
      open={open}
      onClose={close}
      wide
      title={item ? item.name : t("New product")}
      footer={
        <>
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button variant="primary" loading={saving} onClick={save} disabled={item ? !dirty : false}>{item ? t("Save changes") : t("Add product")}</Button>
        </>
      }
    >
      <Card title={t("The basics")}>
        <div className="adm-form-grid">
          <BilingualField label={t("Name")} required en={draft.name} ar={draft.name_ar} maxLength={80} error={errors.name}
            onEn={(v) => setDraft((d) => ({ ...d, name: v, slug: slugTouched ? d.slug : slugify(v) }))} onAr={(v) => set("name_ar", v)} />
          <MoneyField label={t("Price")} value={draft.price} onChange={(v) => set("price", v ?? 0)} error={errors.price} />
          <TextField label={t("Web address")} prefix="/objects/" value={draft.slug} onChange={(v) => { setSlugTouched(true); set("slug", v.toLowerCase()); }} error={errors.slug} dir="ltr"
            hint={item ? t("Changing this breaks links people have already shared.") : t("Filled in from the name.")} />
          <BilingualField label={t("One-line spec")} en={draft.spec} ar={draft.spec_ar} onEn={(v) => set("spec", v)} onAr={(v) => set("spec_ar", v)} maxLength={120} hint={t("For example: Soy wax · 165g · 45 hours")} />
          <BilingualField label={t("Short description")} en={draft.description} ar={draft.description_ar} onEn={(v) => set("description", v)} onAr={(v) => set("description_ar", v)} maxLength={200} hint={t("Shown on the shelf card and in the bag.")} />
        </div>
        <div className="adm-stack" style={{ gap: 4 }}>
          <StylePicker label={t("Name")} value={draft.text_styles.name} sample={draft.name} onChange={(s) => setStyle("name", s)} />
          <StylePicker label={t("Short description")} value={draft.text_styles.description} sample={draft.description} onChange={(s) => setStyle("description", s)} />
        </div>
      </Card>

      <Card title={t("On the website")}>
        <Toggle label={t("Show on the website")} description={draft.is_available ? t("Customers can see and buy it.") : t("Hidden. Only the team can see it here.")} checked={draft.is_available} onChange={(v) => set("is_available", v)} />
        {item && (
          <Toggle label={t("Sold out for today")} description={t("Hides it until 4am tomorrow.")} checked={soldOut} onChange={async (v) => {
            const r = await setSoldOut("object", item.id, v);
            if (!r.ok) return toast.error(r.error);
            onSaved(item.id);
          }} />
        )}
        <div className="adm-field"><span className="adm-label">{t("Labels")}</span><MultiChips label={t("Labels")} value={draft.badges} onChange={(v) => set("badges", v)} options={BADGES.map((b) => ({ ...b, label: t(b.label) }))} /></div>
      </Card>

      <Card title={t("Stock")}>
        <Toggle
          label={t("Count stock for this product")}
          description={t("The count goes down with each order and back up if an order is cancelled. At zero it's hidden automatically.")}
          checked={draft.stock_qty !== null}
          onChange={(v) => set("stock_qty", v ? 10 : null)}
        />
        {draft.stock_qty !== null && (
          <div className="adm-form-grid">
            <NumberField label={t("In stock now")} value={draft.stock_qty} onChange={(v) => set("stock_qty", Math.max(0, Math.round(v ?? 0)))} min={0} />
            <NumberField label={t("Warn me when it gets down to")} value={draft.low_stock_at} onChange={(v) => set("low_stock_at", Math.max(0, Math.round(v ?? 0)))} min={0} />
          </div>
        )}
      </Card>

      <Card title={t("Photos")}>
        <GalleryPicker
          label={t("Product photos")}
          value={draft.images}
          onChange={(v) => set("images", v)}
          folder="retail"
          fallback={item ? BUILT_IN[item.slug] : undefined}
          hint={t("The first photo is the main one. Cut-outs on a transparent background match the rest of the shelf best.")}
        />
      </Card>

      <Card title={t("360° turn")} subtitle={t("Optional. Photos taken all the way round the product, so customers can turn it on the website.")}>
        <GalleryPicker
          label={t("Photos all the way round")}
          value={draft.spin_images}
          onChange={(v) => set("spin_images", v.slice(0, 72))}
          folder="retail"
          sequence
          hint={t("Put the product on a turntable and take a photo every 10° to 15° (24 to 36 photos), same distance and light, starting from the front. Upload them all at once: they're put in order by file name.")}
        />
        {draft.spin_images.length > 1 && (
          <div className="adm-stack" style={{ gap: 6 }}>
            <span className="adm-small adm-muted">{t("Try it: tap to turn, or drag left and right.")}</span>
            <div className="adm-spin-preview"><Spin360 frames={draft.spin_images} alt={draft.name || t("Product")} /></div>
          </div>
        )}
        {draft.spin_images.length === 1 && <p className="adm-small adm-muted" style={{ margin: 0 }}>{t("Add more photos: it needs at least two to turn.")}</p>}
      </Card>

      <Card title={t("The product page")} subtitle={t("The three folding sections under the price.")}>
        <BilingualField label={t("The object")} en={draft.story} ar={draft.story_ar} onEn={(v) => set("story", v)} onAr={(v) => set("story_ar", v)} multiline rows={3} maxLength={800} />
        <BilingualField label={t("Care")} en={draft.care} ar={draft.care_ar} onEn={(v) => set("care", v)} onAr={(v) => set("care_ar", v)} multiline rows={3} maxLength={800} />
        <BilingualField label={t("Collection")} en={draft.collection} ar={draft.collection_ar} onEn={(v) => set("collection", v)} onAr={(v) => set("collection_ar", v)} multiline rows={3} maxLength={800} />
        <div className="adm-stack" style={{ gap: 4 }}>
          <StylePicker label={t("The object")} value={draft.text_styles.story} sample={draft.story} onChange={(s) => setStyle("story", s)} />
          <StylePicker label={t("Care")} value={draft.text_styles.care} sample={draft.care} onChange={(s) => setStyle("care", s)} />
          <StylePicker label={t("Collection")} value={draft.text_styles.collection} sample={draft.collection} onChange={(s) => setStyle("collection", s)} />
        </div>
      </Card>
      {!item && <Notice>{t("New products are hidden until you switch on “Show on the website”.")}</Notice>}
    </Drawer>
  );
}
