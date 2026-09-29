import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Coffee, Copy, ListOrdered, Percent, Plus, Trash2 } from "lucide-react";
import { useLang, useT, pick } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync } from "@/admin/lib/useAsync";
import { money } from "@/admin/lib/format";
import { Button, Chips, IconButton, MoveButtons, SearchInput, SelectField, Toggle, moveInArray } from "@/admin/ui/controls";
import { Badge, EmptyState, LoadError, Loading, PageHeader, Tabs } from "@/admin/ui/layout";
import { useConfirm, useToast } from "@/admin/ui/overlays";
import {
  STATUS_LABEL,
  deleteMenuItem,
  duplicateItem,
  itemStatus,
  loadMenuData,
  reorder,
  saveMenuItem,
  setSoldOut,
  type MenuData,
  type MenuItemRow,
} from "@/admin/sections/catalog/api";
import { MenuItemEditor } from "@/admin/sections/catalog/MenuItemEditor";
import { CategoriesPanel } from "@/admin/sections/catalog/CategoriesPanel";
import { OptionsPanel } from "@/admin/sections/catalog/OptionsPanel";
import { BulkPriceModal } from "@/admin/sections/catalog/BulkPrice";

type Tab = "items" | "categories" | "options";
type Filter = "all" | "live" | "hidden" | "soldout" | "archived";

export function MenuSection() {
  const t = useT();
  const { rest, navigate } = useAdmin();
  const data = useAsync(loadMenuData, []);
  const tab: Tab = rest[0] === "categories" ? "categories" : rest[0] === "options" ? "options" : "items";
  const editing = tab === "items" ? rest[0] ?? null : null;
  const [bulkOpen, setBulkOpen] = useState(false);

  const setTab = (next: Tab) => navigate("menu", next === "items" ? null : next);

  return (
    <>
      <PageHeader
        title={t("Menu")}
        subtitle={t("Everything customers see on the Menu and Pick Up pages. Changes show on the website within a few minutes.")}
        actions={
          tab === "items" && (
            <>
              <Button icon={<Percent size={16} />} onClick={() => setBulkOpen(true)} disabled={!data.data}>{t("Change prices")}</Button>
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate("menu", "new")}>{t("Add item")}</Button>
            </>
          )
        }
      />
      <Tabs
        label={t("Menu sections")}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "items", label: t("Items") },
          { value: "categories", label: t("Categories") },
          { value: "options", label: t("Drink options") },
        ]}
      />
      {data.loading && !data.data ? (
        <Loading />
      ) : data.error || !data.data ? (
        <LoadError message={data.error} onRetry={data.reload} />
      ) : tab === "categories" ? (
        <CategoriesPanel data={data.data} reload={data.reload} />
      ) : tab === "options" ? (
        <OptionsPanel data={data.data} reload={data.reload} />
      ) : (
        <ItemsPanel data={data.data} reload={data.reload} setData={(d) => data.setData(d)} />
      )}
      {data.data && tab === "items" && (
        <>
          <MenuItemEditor
            open={editing !== null}
            itemId={editing === "new" ? null : editing}
            data={data.data}
            onClose={() => navigate("menu")}
            onSaved={async (id) => {
              await data.reload();
              if (id && editing === "new") navigate("menu", id);
            }}
          />
          <BulkPriceModal open={bulkOpen} onClose={() => setBulkOpen(false)} kind="menu" items={data.data.items} categories={data.data.categories} onDone={data.reload} />
        </>
      )}
    </>
  );
}

function ItemsPanel({ data, reload, setData }: { data: MenuData; reload: () => Promise<void>; setData: (d: MenuData) => void }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const { navigate } = useAdmin();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState<MenuItemRow[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (!ordering) setOrder(null);
  }, [ordering]);

  const statuses = useMemo(() => new Map(data.items.map((i) => [i.id, itemStatus(i)])), [data.items]);
  const counts = useMemo(() => {
    const c = { all: 0, live: 0, hidden: 0, soldout: 0, archived: 0 };
    for (const s of statuses.values()) {
      if (s !== "archived") c.all++;
      if (s === "live" || s === "scheduled") c.live++;
      if (s === "hidden") c.hidden++;
      if (s === "soldout") c.soldout++;
      if (s === "archived") c.archived++;
    }
    return c;
  }, [statuses]);

  const visible = data.items.filter((i) => {
    const s = statuses.get(i.id);
    if (filter === "all" && s === "archived") return false;
    if (filter === "live" && s !== "live" && s !== "scheduled") return false;
    if (filter === "hidden" && s !== "hidden") return false;
    if (filter === "soldout" && s !== "soldout") return false;
    if (filter === "archived" && s !== "archived") return false;
    if (category && i.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${i.name} ${i.name_ar} ${i.description}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const patchLocal = (id: string, patch: Partial<MenuItemRow>) =>
    setData({ ...data, items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const toggleVisible = async (item: MenuItemRow, next: boolean) => {
    if (next && item.price <= 0) {
      toast.error(t("Give {name} a price before showing it on the website.", { name: item.name }));
      return;
    }
    patchLocal(item.id, { is_available: next });
    const r = await saveMenuItem({ id: item.id, is_available: next });
    if (!r.ok) {
      patchLocal(item.id, { is_available: !next });
      return toast.error(r.error);
    }
    toast.ok(next ? t("{name} is on the website", { name: item.name }) : t("{name} is hidden", { name: item.name }), async () => {
      patchLocal(item.id, { is_available: !next });
      await saveMenuItem({ id: item.id, is_available: !next });
    });
  };

  const toggleSoldOut = async (item: MenuItemRow) => {
    const soldOut = statuses.get(item.id) !== "soldout";
    const r = await setSoldOut("menu", item.id, soldOut);
    if (!r.ok) return toast.error(r.error);
    patchLocal(item.id, { sold_out_until: r.value });
    toast.ok(soldOut ? t("{name} is sold out until tomorrow morning", { name: item.name }) : t("{name} is back on sale", { name: item.name }), async () => {
      const u = await setSoldOut("menu", item.id, !soldOut);
      if (u.ok) patchLocal(item.id, { sold_out_until: u.value });
    });
  };

  const archive = async (item: MenuItemRow, archived: boolean) => {
    const r = await saveMenuItem({ id: item.id, archived_at: archived ? new Date().toISOString() : null });
    if (!r.ok) return toast.error(r.error);
    await reload();
    toast.ok(archived ? t("{name} archived", { name: item.name }) : t("{name} restored", { name: item.name }), archived ? async () => {
      await saveMenuItem({ id: item.id, archived_at: null });
      await reload();
    } : undefined);
  };

  const remove = async (item: MenuItemRow) => {
    const ok = await confirm({
      title: t("Delete {name} for good?", { name: item.name }),
      body: t("Past orders keep its name and price, but the item itself can't be brought back. Archiving is usually the better choice."),
      confirmLabel: t("Delete for good"),
      danger: true,
    });
    if (!ok) return;
    const r = await deleteMenuItem(item.id);
    if (!r.ok) return toast.error(r.error);
    await reload();
    toast.ok(t("{name} deleted", { name: item.name }));
  };

  const duplicate = async (item: MenuItemRow) => {
    const r = await duplicateItem("menu", item.id);
    if (!r.ok) return toast.error(r.error);
    await reload();
    toast.ok(t("Copy created. It's hidden until you're ready."));
    navigate("menu", r.value);
  };

  const categoryLabel = (slug: string) => {
    const c = data.categories.find((x) => x.slug === slug);
    return c ? pick(lang, c.label, c.label_ar) : slug;
  };

  if (ordering) {
    const cat = category || data.categories[0]?.slug || "";
    const list = order ?? data.items.filter((i) => i.category === cat && !i.archived_at);
    return (
      <div className="adm-stack">
        <div className="adm-spread">
          <SelectField
            label={t("Category to reorder")}
            value={cat}
            onChange={(v) => { setCategory(v); setOrder(null); }}
            options={data.categories.map((c) => ({ value: c.slug, label: pick(lang, c.label, c.label_ar) }))}
          />
          <div className="adm-actions">
            <Button onClick={() => setOrdering(false)}>{t("Cancel")}</Button>
            <Button
              variant="primary"
              loading={savingOrder}
              disabled={!order}
              onClick={async () => {
                if (!order) return;
                setSavingOrder(true);
                const r = await reorder("menu", order.map((i) => i.id));
                setSavingOrder(false);
                if (!r.ok) return toast.error(r.error);
                await reload();
                setOrdering(false);
                toast.ok(t("New order saved"));
              }}
            >
              {t("Save order")}
            </Button>
          </div>
        </div>
        <p className="adm-muted">{t("Use the arrows to put items in the order they should appear on the menu.")}</p>
        <div className="adm-list">
          {list.map((item, index) => (
            <div key={item.id} className="adm-list-row">
              <span className="adm-num adm-muted" style={{ width: 24 }}>{index + 1}</span>
              <span className="adm-list-main"><span className="adm-list-title">{pick(lang, item.name, item.name_ar)}</span></span>
              <MoveButtons index={index} count={list.length} label={item.name} onMove={(from, to) => setOrder(moveInArray(list, from, to))} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="adm-stack">
      <div className="adm-spread">
        <Chips<Filter>
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("All"), count: counts.all },
            { value: "live", label: t("On the website"), count: counts.live },
            { value: "hidden", label: t("Hidden"), count: counts.hidden },
            { value: "soldout", label: t("Sold out today"), count: counts.soldout },
            { value: "archived", label: t("Archived"), count: counts.archived },
          ]}
        />
        <Button size="sm" variant="ghost" icon={<ListOrdered size={16} />} onClick={() => setOrdering(true)}>{t("Change order")}</Button>
      </div>
      <div className="adm-row">
        <SearchInput value={query} onChange={setQuery} placeholder={t("Search the menu")} />
        <select className="adm-select" style={{ maxWidth: 240 }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t("Category")}>
          <option value="">{t("All categories")}</option>
          {data.categories.map((c) => <option key={c.slug} value={c.slug}>{pick(lang, c.label, c.label_ar)}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Coffee size={32} />}
          title={data.items.length === 0 ? t("No menu items yet") : t("Nothing matches")}
          body={data.items.length === 0 ? t("Add your first drink or dish and it will appear on the Menu page.") : t("Try another filter or search word.")}
          action={data.items.length === 0 ? <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate("menu", "new")}>{t("Add item")}</Button> : undefined}
        />
      ) : (
        <div className="adm-list">
          {visible.map((item) => {
            const s = statuses.get(item.id) ?? "live";
            const st = STATUS_LABEL[s];
            return (
              <div key={item.id} className="adm-list-row">
                <button type="button" onClick={() => navigate("menu", item.id)} className="adm-row" style={{ flex: 1, minWidth: 0, border: 0, background: "none", padding: 0, textAlign: "start", cursor: "pointer", color: "inherit", flexWrap: "nowrap" }}>
                  {item.image_url ? <img className="adm-thumb" src={item.image_url} alt="" /> : <span className="adm-thumb"><Coffee size={18} /></span>}
                  <span className="adm-list-main">
                    <span className="adm-list-title">{pick(lang, item.name, item.name_ar)}</span>
                    <span className="adm-list-meta">
                      {categoryLabel(item.category)} · <span className="adm-num">{money(item.price)}</span>
                      {item.price <= 0 && <> · <strong style={{ color: "var(--a-brand)" }}>{t("No price")}</strong></>}
                    </span>
                  </span>
                </button>
                <span className="adm-list-side">
                  <span className="adm-hide-sm"><Badge tone={st.tone}>{t(st.label)}</Badge></span>
                  {s !== "archived" ? (
                    <>
                      {item.is_available && (
                        <Button size="sm" onClick={() => toggleSoldOut(item)}>{s === "soldout" ? t("Back on sale") : t("Sold out")}</Button>
                      )}
                      <Toggle label={<span className="sr-only">{t("Show on website")}</span>} checked={item.is_available} onChange={(v) => toggleVisible(item, v)} />
                      <IconButton label={t("Duplicate")} onClick={() => duplicate(item)}><Copy size={16} /></IconButton>
                      <IconButton label={t("Archive")} onClick={() => archive(item, true)}><Archive size={16} /></IconButton>
                    </>
                  ) : (
                    <>
                      <Button size="sm" icon={<ArchiveRestore size={16} />} onClick={() => archive(item, false)}>{t("Restore")}</Button>
                      <IconButton label={t("Delete for good")} onClick={() => remove(item)}><Trash2 size={16} /></IconButton>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
