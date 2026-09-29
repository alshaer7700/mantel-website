import { useEffect, useRef, useState } from "react";
import { Copy, Images, Trash2, Upload } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAsync } from "@/admin/lib/useAsync";
import { dateOnly } from "@/admin/lib/format";
import { deleteMedia, listMedia, updateMediaAlt, uploadImage, type MediaItem } from "@/admin/lib/media";
import { Button, SearchInput, TextField } from "@/admin/ui/controls";
import { EmptyState, LoadError, Loading, PageHeader } from "@/admin/ui/layout";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";

function size(bytes: number | null): string {
  if (!bytes) return "—";
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`;
}

export function PhotosSection() {
  const t = useT();
  const toast = useToast();
  const media = useAsync(() => listMedia(), []);
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<MediaItem | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(list.length);
    let done = 0;
    for (const file of list) {
      const r = await uploadImage(file, "library");
      if (r.ok) {
        done += 1;
        media.setData((all) => [r.value, ...(all ?? [])]);
      } else toast.error(r.error);
      setUploading((n) => n - 1);
    }
    if (done) toast.ok(done === 1 ? t("Photo uploaded") : t("{n} photos uploaded", { n: done }));
  };

  const q = query.trim().toLowerCase();
  const items = (media.data ?? []).filter((m) => !q || m.alt.toLowerCase().includes(q) || m.folder.toLowerCase().includes(q));
  const missingAlt = (media.data ?? []).filter((m) => !m.alt.trim()).length;

  return (
    <>
      <PageHeader
        overline={t("02 — Website")}
        title={t("Photo library.")}
        subtitle={t("Every photo uploaded to the dashboard, ready to reuse on the menu, the shop and the website.")}
        help={t("Photos are shrunk automatically before uploading, so they load quickly on phones.")}
        actions={(
          <>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
            <Button variant="primary" icon={<Upload size={16} />} loading={uploading > 0} onClick={() => input.current?.click()}>{t("Upload photos")}</Button>
          </>
        )}
      />

      <div className="adm-spread">
        <span className="adm-small adm-muted">
          {t("{n} photos", { n: media.data?.length ?? 0 })}
          {missingAlt > 0 && ` · ${t("{n} without a description", { n: missingAlt })}`}
        </span>
        <SearchInput value={query} onChange={setQuery} placeholder={t("Search photos by description")} />
      </div>

      {media.loading && !media.data ? (
        <Loading />
      ) : media.error ? (
        <LoadError message={media.error} onRetry={media.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Images size={32} />}
          title={q ? t("No photos match that search") : t("No photos yet")}
          body={t("Photos you upload anywhere in the dashboard appear here so you can use them again.")}
          action={!q && <Button icon={<Upload size={16} />} onClick={() => input.current?.click()}>{t("Upload photos")}</Button>}
        />
      ) : (
        <div className="adm-gallery adm-gallery-lg">
          {items.map((item) => (
            <button key={item.id} type="button" className="adm-gallery-item" onClick={() => setOpen(item)} title={item.alt || undefined}>
              <img src={item.url} alt={item.alt} loading="lazy" />
              {!item.alt.trim() && <span className="adm-badge adm-badge-warn" style={{ position: "absolute", bottom: 4, insetInlineStart: 4 }}>{t("No description")}</span>}
            </button>
          ))}
        </div>
      )}

      {open && (
        <PhotoDrawer
          item={open}
          onClose={() => setOpen(null)}
          onSaved={(alt) => {
            media.setData((all) => (all ?? []).map((m) => (m.id === open.id ? { ...m, alt } : m)));
            setOpen(null);
          }}
          onDeleted={() => {
            media.setData((all) => (all ?? []).filter((m) => m.id !== open.id));
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

function PhotoDrawer({ item, onClose, onSaved, onDeleted }: { item: MediaItem; onClose: () => void; onSaved: (alt: string) => void; onDeleted: () => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [alt, setAlt] = useState(item.alt);
  const [saving, setSaving] = useState(false);

  useEffect(() => setAlt(item.alt), [item]);

  const save = async () => {
    setSaving(true);
    const r = await updateMediaAlt(item.id, alt.trim());
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Saved"));
    onSaved(alt.trim());
  };

  const remove = async () => {
    const ok = await confirm({
      title: t("Delete this photo?"),
      body: t("If it's still used on the menu, the shop or the website, that spot will show no photo. This can't be undone."),
      confirmLabel: t("Delete photo"),
      danger: true,
    });
    if (!ok) return;
    const r = await deleteMedia(item);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Photo deleted"));
    onDeleted();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.ok(t("Link copied"));
    } catch {
      toast.error(t("Couldn't copy. Press and hold the link to copy it instead."));
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("Photo details")}
      footer={(
        <div className="adm-spread" style={{ width: "100%" }}>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={remove}>{t("Delete")}</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={alt.trim() === item.alt}>{t("Save changes")}</Button>
        </div>
      )}
    >
      <div className="adm-stack" style={{ gap: 16 }}>
        <img src={item.url} alt={item.alt} style={{ width: "100%", maxHeight: 360, objectFit: "contain", background: "var(--a-surface-2)" }} />
        <TextField
          label={t("Description")}
          value={alt}
          onChange={setAlt}
          maxLength={200}
          placeholder={t("e.g. Iced latte on the marble counter")}
          hint={t("Read aloud to blind visitors and used by Google. Describe what's in the photo.")}
        />
        <div className="adm-stack" style={{ gap: 4 }}>
          <span className="adm-small adm-muted">{t("Uploaded {date}", { date: dateOnly(item.created_at) })}</span>
          <span className="adm-small adm-muted">{item.width && item.height ? `${item.width} × ${item.height} · ` : ""}{size(item.bytes)}</span>
        </div>
        <div><Button icon={<Copy size={16} />} onClick={copy}>{t("Copy link")}</Button></div>
      </div>
    </Drawer>
  );
}
