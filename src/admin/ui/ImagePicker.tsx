import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Images, Trash2, Upload } from "lucide-react";
import { useT } from "@/admin/i18n";
import { listMedia, uploadImage, type MediaItem } from "@/admin/lib/media";
import { useAsync } from "@/admin/lib/useAsync";
import { Button, Field, SearchInput } from "@/admin/ui/controls";
import { EmptyState, Loading, LoadError } from "@/admin/ui/layout";
import { Modal, useToast } from "@/admin/ui/overlays";

type Props = {
  label: ReactNode;
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  hint?: ReactNode;
  /** Shown when there is no uploaded photo — e.g. the built-in photograph. */
  fallback?: string | null;
};

export function ImagePicker({ label, value, onChange, folder = "general", hint, fallback }: Props) {
  const t = useT();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadImage(file, folder);
    setUploading(false);
    if (!result.ok) toast.error(result.error);
    else {
      onChange(result.value.url);
      toast.ok(t("Photo uploaded"));
    }
  };

  const shown = value || fallback || null;

  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="adm-image">
          <div
            className={`adm-image-frame ${shown ? "" : "is-empty"} ${drag ? "is-drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void upload(e.dataTransfer.files?.[0]);
            }}
          >
            {shown ? (
              <img src={shown} alt="" />
            ) : (
              <>
                <ImagePlus size={28} aria-hidden="true" />
                <span>{t("Drop a photo here, or use the buttons below")}</span>
              </>
            )}
            {!value && fallback && (
              <span className="adm-badge" style={{ position: "absolute", top: 8, insetInlineStart: 8 }}>{t("Current built-in photo")}</span>
            )}
          </div>
          <div className="adm-row">
            <input
              id={id}
              ref={input}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button icon={<Upload size={16} />} loading={uploading} onClick={() => input.current?.click()}>
              {value ? t("Replace photo") : t("Upload photo")}
            </Button>
            <Button icon={<Images size={16} />} onClick={() => setLibraryOpen(true)}>{t("Choose from library")}</Button>
            {value && (
              <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => onChange(null)}>
                {fallback ? t("Use built-in photo") : t("Remove")}
              </Button>
            )}
          </div>
          <MediaLibraryModal
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            onPick={(item) => {
              onChange(item.url);
              setLibraryOpen(false);
            }}
          />
        </div>
      )}
    </Field>
  );
}

/** Several photos in order — the first is the one the shelf and the cart show. */
export function GalleryPicker({ label, value, onChange, folder = "general", hint, fallback }: { label: ReactNode; value: string[]; onChange: (v: string[]) => void; folder?: string; hint?: ReactNode; fallback?: readonly string[] }) {
  const t = useT();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const uploadMany = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const result = await uploadImage(file, folder);
      if (result.ok) added.push(result.value.url);
      else toast.error(result.error);
    }
    setUploading(false);
    if (added.length) {
      onChange([...value, ...added]);
      toast.ok(added.length === 1 ? t("Photo uploaded") : t("{n} photos uploaded", { n: added.length }));
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="adm-stack">
          {value.length === 0 && fallback && fallback.length > 0 && (
            <div className="adm-stack" style={{ gap: 6 }}>
              <span className="adm-small adm-muted">{t("Showing the built-in photos until you upload your own:")}</span>
              <div className="adm-gallery">
                {fallback.map((src) => (
                  <div key={src} className="adm-gallery-item" style={{ cursor: "default", opacity: 0.8 }}><img src={src} alt="" /></div>
                ))}
              </div>
            </div>
          )}
          {value.length > 0 && (
            <div className="adm-gallery">
              {value.map((src, index) => (
                <div key={`${src}-${index}`} className="adm-gallery-item" style={{ cursor: "default" }}>
                  <img src={src} alt="" />
                  {index === 0 && <span className="adm-badge adm-badge-dark" style={{ position: "absolute", bottom: 4, insetInlineStart: 4 }}>{t("Main")}</span>}
                  <div className="adm-gallery-tools">
                    <button type="button" onClick={() => move(index, -1)} aria-label={t("Move earlier")} disabled={index === 0}><ArrowLeft size={14} className="adm-flip-rtl" /></button>
                    <button type="button" onClick={() => move(index, 1)} aria-label={t("Move later")} disabled={index === value.length - 1}><ArrowRight size={14} className="adm-flip-rtl" /></button>
                    <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={t("Remove photo")}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="adm-row">
            <input id={id} ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void uploadMany(e.target.files); e.target.value = ""; }} />
            <Button icon={<Upload size={16} />} loading={uploading} onClick={() => input.current?.click()}>{t("Upload photos")}</Button>
            <Button icon={<Images size={16} />} onClick={() => setLibraryOpen(true)}>{t("Choose from library")}</Button>
          </div>
          <MediaLibraryModal
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            onPick={(item) => {
              onChange([...value, item.url]);
              setLibraryOpen(false);
            }}
          />
        </div>
      )}
    </Field>
  );
}

export function MediaLibraryModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (item: MediaItem) => void }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const media = useAsync(() => listMedia(), [open]);
  const items = (media.data ?? []).filter((m) => !query.trim() || m.alt.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title={t("Photo library")} wide>
      <SearchInput value={query} onChange={setQuery} placeholder={t("Search photos by description")} />
      {media.loading && !media.data ? (
        <Loading />
      ) : media.error ? (
        <LoadError message={media.error} onRetry={media.reload} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Images size={32} />} title={t("No photos yet")} body={t("Photos you upload anywhere in the dashboard appear here so you can use them again.")} />
      ) : (
        <div className="adm-gallery">
          {items.map((item) => (
            <button key={item.id} type="button" className="adm-gallery-item" onClick={() => onPick(item)} title={item.alt}>
              <img src={item.url} alt={item.alt} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
