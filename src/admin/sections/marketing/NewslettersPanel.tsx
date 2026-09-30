import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Copy, Mail, Plus, Send, Trash2 } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { db, run } from "@/admin/lib/db";
import { useAsync, useUnsavedGuard } from "@/admin/lib/useAsync";
import { dateTime } from "@/admin/lib/format";
import { loadLetterhead } from "@/admin/lib/letterhead";
import { Button, Segmented, TextArea, TextField } from "@/admin/ui/controls";
import { ImagePicker } from "@/admin/ui/ImagePicker";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, SaveBar, Stat } from "@/admin/ui/layout";
import { useConfirm, useToast } from "@/admin/ui/overlays";
import {
  DEFAULT_NEWSLETTER_HEAD,
  renderNewsletter,
  safeUrl,
  type NewsletterContent,
  type NewsletterHead,
} from "../../../../supabase/functions/newsletter-send/template";

/*
 * Newsletters: write one, see exactly what subscribers will get, send
 * yourself a test, then send it to everyone who's subscribed. The sending is
 * done by the newsletter-send function (supabase/functions), which checks the
 * sender's 'marketing' permission and sends each newsletter only once.
 */

type Campaign = NewsletterContent & {
  id: string;
  status: "draft" | "sending" | "sent" | "failed";
  recipients: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  test_sent_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const FIELDS = ["subject", "preheader", "heading", "body", "image_url", "button_label", "button_url"] as const;

const pickContent = (c: NewsletterContent): NewsletterContent =>
  Object.fromEntries(FIELDS.map((k) => [k, c[k] ?? ""])) as NewsletterContent;

/** The function's own error sentence, when it sent one. */
async function sendError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      /* fall through */
    }
  }
  return error instanceof Error && error.message ? error.message : "Couldn't reach the email service. Try again.";
}

export function NewslettersPanel() {
  const { rest } = useAdmin();
  const id = rest[1];
  return id ? <NewsletterEditor key={id} id={id} /> : <NewsletterList />;
}

function statusBadge(c: Campaign, t: ReturnType<typeof useT>) {
  if (c.status === "sent") return <Badge tone="ok" dot>{t("Sent to {n}", { n: c.sent_count })}</Badge>;
  if (c.status === "sending") return <Badge tone="info" dot>{t("Sending…")}</Badge>;
  if (c.status === "failed") return <Badge tone="danger" dot>{t("Didn't send")}</Badge>;
  return <Badge>{t("Draft")}</Badge>;
}

/* ── The list ────────────────────────────────────────────────────────────── */

function NewsletterList() {
  const t = useT();
  const toast = useToast();
  const { navigate } = useAdmin();
  const list = useAsync(() => run<Campaign[]>(db.from("newsletter_campaigns").select("*").order("created_at", { ascending: false })), []);
  const subs = useAsync(async () => {
    const r = await run<unknown[]>(db.from("newsletter_subscribers").select("email").eq("status", "active"));
    return r.ok ? { ok: true as const, value: r.value.length } : r;
  }, []);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    const r = await run<Campaign[]>(db.from("newsletter_campaigns").insert({ subject: "", heading: "" }).select("id"));
    setCreating(false);
    if (!r.ok) return toast.error(r.error);
    const newId = r.value[0]?.id;
    if (newId) navigate("marketing", "campaigns", newId);
  };

  const sent = (list.data ?? []).filter((c) => c.status === "sent");
  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-grid-4">
        <Stat label={t("Subscribers")} value={subs.data ?? "—"} note={t("Get the next newsletter")} />
        <Stat label={t("Newsletters sent")} value={sent.length} />
      </div>
      <div className="adm-spread">
        <p className="adm-muted adm-small" style={{ margin: 0 }}>{t("Every newsletter has an unsubscribe link at the bottom.")}</p>
        <Button variant="primary" icon={<Plus size={16} />} onClick={create} loading={creating}>{t("New newsletter")}</Button>
      </div>
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <LoadError message={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState icon={<Mail size={32} />} title={t("No newsletters yet")} body={t("Write one to tell your subscribers about a new drink, an event, or opening times.")} />
      ) : (
        <div className="adm-list">
          {list.data.map((c) => (
            <button key={c.id} type="button" className="adm-list-row" onClick={() => navigate("marketing", "campaigns", c.id)}>
              <span className="adm-list-main">
                <span className="adm-list-title">{c.subject || t("Untitled newsletter")}</span>
                <span className="adm-list-meta">
                  {c.sent_at && c.status !== "draft" ? t("Sent {date}", { date: dateTime(c.sent_at) }) : t("Last changed {date}", { date: dateTime(c.updated_at) })}
                </span>
              </span>
              <span className="adm-list-side">
                {statusBadge(c, t)}
                <ChevronRight size={18} className="adm-flip-rtl" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── One newsletter ──────────────────────────────────────────────────────── */

function NewsletterEditor({ id }: { id: string }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { navigate } = useAdmin();
  const row = useAsync(async () => {
    const r = await run<Campaign[]>(db.from("newsletter_campaigns").select("*").eq("id", id).limit(1));
    if (!r.ok) return r;
    return r.value[0] ? { ok: true as const, value: r.value[0] } : { ok: false as const, error: t("That newsletter no longer exists.") };
  }, [id]);
  const head = useAsync(async () => {
    const r = await loadLetterhead();
    const value: NewsletterHead = r.ok
      ? { name: r.value.name, logo_url: r.value.logo_url, address: r.value.address, email: r.value.email, instagram: r.value.instagram }
      : DEFAULT_NEWSLETTER_HEAD;
    return { ok: true as const, value };
  }, []);
  const subs = useAsync(async () => {
    const r = await run<unknown[]>(db.from("newsletter_subscribers").select("email").eq("status", "active"));
    return r.ok ? { ok: true as const, value: r.value.length } : r;
  }, []);

  const [draft, setDraft] = useState<NewsletterContent | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "send" | null>(null);
  const [view, setView] = useState<"phone" | "desktop">("phone");

  useEffect(() => {
    if (row.data) setDraft(pickContent(row.data));
  }, [row.data]);

  const saved = row.data ? pickContent(row.data) : null;
  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);
  useUnsavedGuard(dirty);

  const html = useMemo(
    () => (draft ? renderNewsletter(draft, head.data ?? DEFAULT_NEWSLETTER_HEAD, "https://bymantel.com/unsubscribe").html : ""),
    [draft, head.data],
  );

  if (row.loading && !row.data && !row.error) return <Loading />;
  if (row.error) return <LoadError message={row.error} onRetry={row.reload} />;
  if (!row.data || !draft) return <Loading />;

  const c = row.data;
  const editable = c.status === "draft";
  const set = (k: keyof NewsletterContent, v: string) => setDraft({ ...draft, [k]: v });
  const linkBad = !!draft.button_url.trim() && !safeUrl(draft.button_url);
  const ready = !!draft.subject.trim() && !!(draft.heading.trim() || draft.body.trim()) && !linkBad;

  const save = async (): Promise<boolean> => {
    if (!dirty) return true;
    const r = await run(db.from("newsletter_campaigns").update(draft).eq("id", id));
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    await row.reload();
    return true;
  };

  const invoke = async (test: boolean) => {
    const { data, error } = await db.functions.invoke<{ sent: number; failed: number; to?: string }>("newsletter-send", { body: { id, test } });
    if (error) return { ok: false as const, error: t(await sendError(error)) };
    return { ok: true as const, value: data };
  };

  const sendTest = async () => {
    setBusy("test");
    if (!(await save())) return setBusy(null);
    const r = await invoke(true);
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Test sent to {email}. Check your inbox (and spam).", { email: r.value?.to ?? "" }));
    await row.reload();
  };

  const sendAll = async () => {
    const n = subs.data ?? 0;
    const ok = await confirm({
      title: t("Send to {n} subscribers?", { n }),
      body: t("It goes out now and can't be taken back. Send yourself a test first if you haven't."),
      confirmLabel: t("Send now"),
      typeToConfirm: "send",
    });
    if (!ok) return;
    setBusy("send");
    if (!(await save())) return setBusy(null);
    const r = await invoke(false);
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
    } else {
      toast.ok(t("Sent to {n} subscribers", { n: r.value?.sent ?? 0 }));
    }
    await row.reload();
  };

  const remove = async () => {
    if (!(await confirm({ title: t("Delete this draft?"), confirmLabel: t("Delete"), danger: true }))) return;
    const r = await run(db.from("newsletter_campaigns").delete().eq("id", id));
    if (!r.ok) return toast.error(r.error);
    navigate("marketing", "campaigns");
  };

  const duplicate = async () => {
    const r = await run<Campaign[]>(db.from("newsletter_campaigns").insert(pickContent(draft)).select("id"));
    if (!r.ok) return toast.error(r.error);
    const newId = r.value[0]?.id;
    if (newId) navigate("marketing", "campaigns", newId);
    toast.ok(t("Copied into a new draft"));
  };

  return (
    <>
      <PageHeader
        overline={<button type="button" className="adm-link-back" onClick={() => navigate("marketing", "campaigns")}><ArrowLeft size={14} className="adm-flip-rtl" /> {t("All newsletters")}</button>}
        title={draft.subject || t("Untitled newsletter")}
        subtitle={c.test_sent_at && editable ? t("Last test sent {date}", { date: dateTime(c.test_sent_at) }) : undefined}
        actions={editable ? (
          <>
            <Button icon={<Mail size={16} />} onClick={sendTest} loading={busy === "test"} disabled={!ready || busy !== null}>{t("Send me a test")}</Button>
            <Button variant="primary" icon={<Send size={16} />} onClick={sendAll} loading={busy === "send"} disabled={!ready || busy !== null || !subs.data}>
              {t("Send to {n} subscribers", { n: subs.data ?? 0 })}
            </Button>
          </>
        ) : c.status === "failed" ? (
          <Button variant="primary" icon={<Send size={16} />} onClick={sendAll} loading={busy === "send"} disabled={busy !== null || !subs.data}>{t("Try sending again")}</Button>
        ) : (
          <Button icon={<Copy size={16} />} onClick={duplicate}>{t("Copy into a new newsletter")}</Button>
        )}
      />

      {c.status === "sent" && (
        <div className="adm-grid-4" style={{ marginBottom: 16 }}>
          <Stat label={t("Sent to")} value={c.sent_count} note={c.sent_at ? dateTime(c.sent_at) : undefined} />
          {c.failed_count > 0 && <Stat label={t("Didn't arrive")} value={c.failed_count} alert />}
        </div>
      )}
      {c.status === "failed" && <Notice tone="danger" title={t("This newsletter didn't send")}>{c.last_error || t("The email service didn't accept it.")}</Notice>}
      {c.status === "sending" && <Notice title={t("Sending…")}>{t("This takes a few seconds for every hundred subscribers.")}</Notice>}

      <div className="adm-newsletter-layout">
        {editable ? (
          <div className="adm-stack" style={{ gap: 16 }}>
            <Card title={t("The email")}>
              <div className="adm-stack">
                <TextField label={t("Subject")} value={draft.subject} onChange={(v) => set("subject", v)} maxLength={200} placeholder={t("e.g. Friday Espresso is back")} />
                <TextField label={t("Preview text")} optional value={draft.preheader} onChange={(v) => set("preheader", v)} maxLength={200} hint={t("Shown after the subject in most inboxes.")} />
              </div>
            </Card>
            <Card title={t("Inside")}>
              <div className="adm-stack">
                <ImagePicker label={t("Photo")} value={draft.image_url || null} onChange={(url) => set("image_url", url ?? "")} folder="newsletter" hint={t("Optional. Shown at the top, full width.")} />
                <TextField label={t("Heading")} value={draft.heading} onChange={(v) => set("heading", v)} maxLength={200} />
                <TextArea label={t("Text")} rows={9} value={draft.body} onChange={(v) => set("body", v)} maxLength={20000} hint={t("Leave an empty line between paragraphs.")} />
                <div className="adm-form-grid">
                  <TextField label={t("Button text")} optional value={draft.button_label} onChange={(v) => set("button_label", v)} maxLength={60} placeholder={t("e.g. See the menu")} />
                  <TextField label={t("Button link")} optional value={draft.button_url} onChange={(v) => set("button_url", v)} maxLength={500} dir="ltr" placeholder="/menu" error={linkBad ? t("Use a full link starting with https://, or a page like /menu") : undefined} />
                </div>
              </div>
            </Card>
            <div className="adm-row" style={{ flexWrap: "wrap" }}>
              <Button variant="danger" icon={<Trash2 size={16} />} onClick={remove}>{t("Delete draft")}</Button>
              <Button icon={<Copy size={16} />} onClick={duplicate}>{t("Copy into a new newsletter")}</Button>
            </div>
          </div>
        ) : null}
        <div className="adm-newsletter-preview">
          <div className="adm-spread" style={{ marginBottom: 8 }}>
            <p className="adm-overline" style={{ margin: 0 }}>{t("Preview")}</p>
            <Segmented
              label={t("Preview size")}
              value={view}
              onChange={setView}
              options={[
                { value: "phone", label: t("Phone") },
                { value: "desktop", label: t("Computer") },
              ]}
            />
          </div>
          <div className="adm-newsletter-inbox">
            <strong>{draft.subject || t("Untitled newsletter")}</strong>
            <span>{draft.preheader || draft.heading}</span>
          </div>
          <iframe title={t("Preview")} className={`adm-newsletter-frame is-${view}`} srcDoc={html} sandbox="" />
        </div>
      </div>
      {editable && <SaveBar dirty={dirty} saving={busy === "save"} onSave={async () => { setBusy("save"); if (await save()) toast.ok(t("Draft saved")); setBusy(null); }} onDiscard={() => saved && setDraft(saved)} />}
    </>
  );
}

