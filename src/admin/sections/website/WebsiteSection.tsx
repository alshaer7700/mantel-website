import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, FileText, History, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { db, rpc, run } from "@/admin/lib/db";
import { useAsync, useUnsavedGuard } from "@/admin/lib/useAsync";
import { ago, dateTime } from "@/admin/lib/format";
import { Button, IconButton, MoveButtons, TextArea, TextField, moveInArray } from "@/admin/ui/controls";
import { ImagePicker } from "@/admin/ui/ImagePicker";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, SaveBar } from "@/admin/ui/layout";
import { Modal, useConfirm, useToast } from "@/admin/ui/overlays";
import { PAGE_DEFAULTS, contentKey, mergePage, type ListItem, type PageValues } from "@/lib/content/pages";
import { PAGES, type FieldDef, type ListFieldDef, type PageDef } from "@/admin/sections/website/schema";

/*
 * Website pages: the words and photos on the public site.
 *
 * Each page is edited as a draft (site_content.draft) and goes live when
 * someone presses Publish (admin_publish_content, which also keeps the last 30
 * published versions for "Earlier versions"). The website reads only what's
 * published, and anything never edited shows the original text.
 */

type Row = { key: string; draft: PageValues | null; published: PageValues | null; published_at: string | null; updated_at: string };
type Version = { id: number; value: PageValues; published_at: string; published_by_email: string | null };

const SITE = "https://bymantel.com";

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function WebsiteSection() {
  const { rest } = useAdmin();
  const page = PAGES.find((p) => p.key === rest[0]);
  return page ? <PageEditor key={page.key} def={page} /> : <PageList />;
}

/* ── The list ────────────────────────────────────────────────────────────── */

function PageList() {
  const t = useT();
  const { navigate } = useAdmin();
  const rows = useAsync(() => run<Row[]>(db.from("site_content").select("key, draft, published, published_at, updated_at").like("key", "page.%")), []);
  const byKey = new Map((rows.data ?? []).map((r) => [r.key, r]));

  return (
    <>
      <PageHeader overline={t("02 — Website")} title={t("Website pages.")} subtitle={t("Change the words and photos on the website. Nothing changes for visitors until you press Publish.")} />
      {rows.loading && !rows.data ? (
        <Loading />
      ) : rows.error ? (
        <LoadError message={rows.error} onRetry={rows.reload} />
      ) : (
        <div className="adm-list">
          {PAGES.map((p) => {
            const r = byKey.get(contentKey(p.key));
            const pending = r?.draft && !same(r.draft, r.published);
            return (
              <button key={p.key} type="button" className="adm-list-row" onClick={() => navigate("website", p.key)}>
                <span className="adm-list-main">
                  <span className="adm-list-title">{t(p.title)}</span>
                  <span className="adm-list-meta" dir="ltr" style={{ textAlign: "start" }}>bymantel.com{p.path === "/" ? "" : p.path}</span>
                </span>
                <span className="adm-list-side">
                  {pending ? (
                    <Badge tone="warn" dot>{t("Draft not published")}</Badge>
                  ) : r?.published ? (
                    <Badge tone="ok" dot>{t("Published {when}", { when: ago(r.published_at) })}</Badge>
                  ) : (
                    <Badge>{t("Original text")}</Badge>
                  )}
                  <ChevronRight size={18} className="adm-flip-rtl" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── One page ────────────────────────────────────────────────────────────── */

function PageEditor({ def }: { def: PageDef }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { navigate } = useAdmin();
  const key = contentKey(def.key);
  const row = useAsync(async () => {
    const r = await run<Row[]>(db.from("site_content").select("key, draft, published, published_at, updated_at").eq("key", key).limit(1));
    return r.ok ? { ok: true as const, value: r.value[0] ?? null } : r;
  }, [key]);

  /* What the editor starts from: the saved draft, else what's live, else the original. */
  const start = useMemo<PageValues | null>(() => {
    if (row.data === undefined || (row.loading && row.data === null && !row.error)) return null;
    const r = row.data;
    return mergePage(def.key, r?.draft ?? r?.published ?? null) as PageValues;
  }, [row.data, row.loading, row.error, def.key]);

  const [values, setValues] = useState<PageValues | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (start) setValues(start);
  }, [start]);

  const dirty = !!values && !!start && !same(values, start);
  useUnsavedGuard(dirty);

  if (row.loading && !row.data && !row.error) return <Loading />;
  if (row.error) return <LoadError message={row.error} onRetry={row.reload} />;
  if (!values) return <Loading />;

  const r = row.data;
  const live = mergePage(def.key, r?.published ?? null) as PageValues;
  const unpublished = !same(values, live);

  const saveDraft = async (): Promise<boolean> => {
    const { data: session } = await db.auth.getSession();
    const res = await run(db.from("site_content").upsert(
      { key, draft: values, updated_at: new Date().toISOString(), updated_by: session.session?.user.id ?? null },
      { onConflict: "key" },
    ));
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    return true;
  };

  const save = async () => {
    setBusy("save");
    const ok = await saveDraft();
    setBusy(null);
    if (!ok) return;
    toast.ok(t("Draft saved. Visitors still see the published version."));
    await row.reload();
  };

  const publish = async () => {
    const ok = await confirm({
      title: t("Publish {page}?", { page: t(def.title) }),
      body: t("Visitors will see these changes within a minute or two."),
      confirmLabel: t("Publish"),
    });
    if (!ok) return;
    setBusy("publish");
    if (!(await saveDraft())) return setBusy(null);
    const res = await rpc<boolean>("admin_publish_content", { p_key: key });
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    toast.ok(t("{page} is live", { page: t(def.title) }));
    await row.reload();
  };

  const original = async () => {
    const ok = await confirm({
      title: t("Go back to the original text?"),
      body: t("The boxes are filled with the text the website started with. Nothing changes for visitors until you publish."),
      confirmLabel: t("Use the original text"),
    });
    if (ok) setValues({ ...(PAGE_DEFAULTS[def.key] as PageValues) });
  };

  const set = (id: string, v: string | ListItem[]) => setValues({ ...values, [id]: v });

  return (
    <>
      <PageHeader
        overline={<button type="button" className="adm-link-back" onClick={() => navigate("website")}><ArrowLeft size={14} className="adm-flip-rtl" /> {t("All pages")}</button>}
        title={t(def.title)}
        subtitle={r?.published_at ? t("Last published {when}", { when: dateTime(r.published_at) }) : t("Showing the original text. Nothing has been published from here yet.")}
        actions={(
          <>
            <a className="adm-btn" href={`${SITE}${def.path}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} aria-hidden="true" /> {t("View on website")}
            </a>
            <Button variant="primary" icon={<Upload size={16} />} onClick={publish} loading={busy === "publish"} disabled={!unpublished && !dirty}>{t("Publish")}</Button>
          </>
        )}
      />
      <div className="adm-stack" style={{ gap: 16, maxWidth: 820 }}>
        {unpublished && !dirty && <Notice tone="warn" title={t("This draft isn't on the website yet")}>{t("Press Publish when you're happy with it.")}</Notice>}
        {def.note && <Notice>{t(def.note)}</Notice>}
        {def.groups.map((g) => (
          <Card key={g.title} title={t(g.title)}>
            <div className="adm-stack">
              {g.fields.map((f) => (
                <FieldEditor key={f.id} field={f} value={values[f.id]} fallback={(PAGE_DEFAULTS[def.key] as PageValues)[f.id]} onChange={(v) => set(f.id, v)} />
              ))}
            </div>
          </Card>
        ))}
        <div className="adm-row" style={{ flexWrap: "wrap" }}>
          <Button icon={<History size={16} />} onClick={() => setHistoryOpen(true)}>{t("Earlier versions")}</Button>
          <Button icon={<RotateCcw size={16} />} onClick={original}>{t("Go back to the original text")}</Button>
        </div>
      </div>
      <SaveBar dirty={dirty} saving={busy === "save"} onSave={() => void save()} onDiscard={() => setValues(start)} message={t("Save as a draft, or publish to put it live")} />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        contentKey={key}
        onRestore={(v) => {
          setValues(mergePage(def.key, v) as PageValues);
          setHistoryOpen(false);
          toast.ok(t("Version loaded. Publish to put it back on the website."));
        }}
      />
    </>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────────── */

function FieldEditor({ field, value, fallback, onChange }: { field: FieldDef; value: string | ListItem[] | undefined; fallback: string | ListItem[] | undefined; onChange: (v: string | ListItem[]) => void }) {
  const t = useT();
  if (field.kind === "list") return <ListEditor field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />;
  const text = typeof value === "string" ? value : "";
  if (field.kind === "image") {
    const original = typeof fallback === "string" ? fallback : null;
    return (
      <ImagePicker
        label={t(field.label)}
        value={text && text !== original ? text : null}
        onChange={(url) => onChange(url ?? original ?? "")}
        folder="website"
        fallback={original}
        hint={field.hint ? t(field.hint) : undefined}
      />
    );
  }
  const common = { label: t(field.label), value: text, onChange: (v: string) => onChange(v), maxLength: field.max, hint: field.hint ? t(field.hint) : undefined };
  return field.kind === "textarea" ? <TextArea {...common} rows={field.rows ?? 3} /> : <TextField {...common} />;
}

function ListEditor({ field, value, onChange }: { field: ListFieldDef; value: ListItem[]; onChange: (v: ListItem[]) => void }) {
  const t = useT();
  const blank = () => Object.fromEntries(field.item.map((f) => [f.id, ""]));
  const setItem = (i: number, id: string, v: string) => onChange(value.map((row, j) => (j === i ? { ...row, [id]: v } : row)));
  return (
    <div className="adm-stack" style={{ gap: 12 }}>
      {field.hint && <p className="adm-hint">{t(field.hint)}</p>}
      {value.length === 0 && <EmptyState icon={<FileText size={28} />} title={t("Nothing here yet")} />}
      {value.map((row, i) => (
        <div key={i} className="adm-cms-item">
          <div className="adm-cms-item-head">
            <span className="adm-overline">{t(field.itemLabel)} {i + 1}</span>
            <span className="adm-row" style={{ gap: 4, flexWrap: "nowrap" }}>
              <MoveButtons index={i} count={value.length} onMove={(a, b) => onChange(moveInArray(value, a, b))} label={`${t(field.itemLabel)} ${i + 1}`} />
              <IconButton label={t("Remove")} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={16} /></IconButton>
            </span>
          </div>
          {field.item.map((f) => {
            const common = { label: t(f.label), value: row[f.id] ?? "", onChange: (v: string) => setItem(i, f.id, v), maxLength: f.max, hint: f.hint ? t(f.hint) : undefined };
            return f.kind === "textarea" ? <TextArea key={f.id} {...common} rows={f.rows ?? 3} /> : <TextField key={f.id} {...common} />;
          })}
        </div>
      ))}
      {(!field.max || value.length < field.max) && (
        <div>
          <Button icon={<Plus size={16} />} onClick={() => onChange([...value, blank()])}>{t(field.addLabel)}</Button>
        </div>
      )}
    </div>
  );
}

/* ── Earlier versions ────────────────────────────────────────────────────── */

function HistoryModal({ open, onClose, contentKey: key, onRestore }: { open: boolean; onClose: () => void; contentKey: string; onRestore: (v: PageValues) => void }) {
  const t = useT();
  const versions = useAsync(
    () => (open
      ? run<Version[]>(db.from("site_content_versions").select("id, value, published_at, published_by_email").eq("key", key).order("published_at", { ascending: false }).limit(30))
      : Promise.resolve({ ok: true as const, value: [] as Version[] })),
    [open, key],
  );
  return (
    <Modal open={open} onClose={onClose} title={t("Earlier versions")}>
      {versions.loading && !versions.data ? (
        <Loading />
      ) : versions.error ? (
        <LoadError message={versions.error} onRetry={versions.reload} />
      ) : !versions.data?.length ? (
        <p className="adm-muted">{t("Nothing has been published from here yet.")}</p>
      ) : (
        <div className="adm-list">
          {versions.data.map((v, i) => (
            <div key={v.id} className="adm-list-row">
              <span className="adm-list-main">
                <span className="adm-list-title">{dateTime(v.published_at)}{i === 0 && <> · <Badge tone="ok">{t("On the website")}</Badge></>}</span>
                <span className="adm-list-meta">{v.published_by_email ?? "—"}</span>
              </span>
              <Button size="sm" onClick={() => onRestore(v.value)}>{t("Use this version")}</Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
