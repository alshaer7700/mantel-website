import { supabase } from "@/lib/api/staffClient";
import { db, run, type Result } from "@/admin/lib/db";
import { currentLang, translate } from "@/admin/i18n";

export const MEDIA_BUCKET = "site-media";

export type MediaItem = {
  id: string;
  path: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  folder: string;
  created_at: string;
};

const t = (s: string) => translate(currentLang(), s);

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

/*
 * Phones take 4000px, 5 MB photos. The site never shows anything wider than
 * ~1800px, so every upload is scaled down and re-encoded as WebP in the
 * browser before it leaves the device: a faster upload for the manager and a
 * faster page for every customer. Transparency survives (WebP has alpha), which
 * matters for the retail cut-outs.
 */
async function prepare(file: File, maxDim: number): Promise<{ blob: Blob; width: number; height: number; ext: string; type: string }> {
  if (file.type === "image/gif") {
    const img = await loadImage(file);
    return { blob: file, width: img.naturalWidth, height: img.naturalHeight, ext: "gif", type: "image/gif" };
  }
  const img = await loadImage(file);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (blob && blob.type === "image/webp") return { blob, width, height, ext: "webp", type: "image/webp" };
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!jpeg) throw new Error("encode failed");
  return { blob: jpeg, width, height, ext: "jpg", type: "image/jpeg" };
}

export async function uploadImage(file: File, folder = "general", alt = "", maxDim = 1800): Promise<Result<MediaItem>> {
  if (!file.type.startsWith("image/")) return { ok: false, error: t("That file isn't a photo. Choose a JPG, PNG or WebP image.") };
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: t("That photo is too large. Choose one under 25 MB.") };
  let prepared;
  try {
    prepared = await prepare(file, maxDim);
  } catch {
    return { ok: false, error: t("This photo couldn't be read. Try saving it as JPG and uploading again.") };
  }
  const now = new Date();
  const id = crypto.randomUUID();
  const path = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${prepared.ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, prepared.blob, {
    contentType: prepared.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return { ok: false, error: /row-level|permission|unauthor/i.test(error.message) ? t("You don't have permission to upload photos.") : t("The upload failed. Check the connection and try again.") };
  }
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const { data: session } = await supabase.auth.getSession();
  const row = {
    path,
    url: data.publicUrl,
    alt: alt || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120),
    width: prepared.width,
    height: prepared.height,
    bytes: prepared.blob.size,
    folder,
    created_by: session.session?.user.id ?? null,
  };
  const inserted = await run<MediaItem>(db.from("media_library").insert(row).select().single());
  if (!inserted.ok) return inserted;
  return { ok: true, value: inserted.value };
}

export async function listMedia(): Promise<Result<MediaItem[]>> {
  return run<MediaItem[]>(db.from("media_library").select("*").order("created_at", { ascending: false }).limit(500));
}

export async function updateMediaAlt(id: string, alt: string): Promise<Result<unknown>> {
  return run(db.from("media_library").update({ alt }).eq("id", id));
}

export async function deleteMedia(item: MediaItem): Promise<Result<true>> {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([item.path]);
  if (error) return { ok: false, error: t("The photo couldn't be deleted. Try again.") };
  const result = await run(db.from("media_library").delete().eq("id", item.id));
  if (!result.ok) return result;
  return { ok: true, value: true };
}
