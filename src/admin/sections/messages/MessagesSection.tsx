import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Inbox, Mail, MessageCircle, Phone } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync } from "@/admin/lib/useAsync";
import { ago, dateTime } from "@/admin/lib/format";
import { db, run } from "@/admin/lib/db";
import { Button, Chips, SearchInput } from "@/admin/ui/controls";
import { Badge, EmptyState, LoadError, Loading, PageHeader } from "@/admin/ui/layout";
import { Drawer, useToast } from "@/admin/ui/overlays";
import { whatsappNumber } from "@/admin/sections/orders/api";

export type ContactMessage = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "resolved";
  created_at: string;
};

type Filter = "open" | "new" | "resolved" | "all";

const STATUS_TONE = { new: "danger", read: "neutral", resolved: "ok" } as const;
const STATUS_LABEL = { new: "New", read: "Read", resolved: "Done" } as const;

const loadMessages = () =>
  run<ContactMessage[]>(db.from("contact_messages").select("id, first_name, last_name, email, phone, message, status, created_at").order("created_at", { ascending: false }).limit(500));

export function MessagesSection() {
  const t = useT();
  const toast = useToast();
  const { rest, navigate, refreshCounts } = useAdmin();
  const messages = useAsync(loadMessages, []);
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const openId = rest[0] ?? null;

  const setStatus = async (m: ContactMessage, status: ContactMessage["status"], quiet = false) => {
    messages.setData((all) => (all ?? []).map((x) => (x.id === m.id ? { ...x, status } : x)));
    const r = await run(db.from("contact_messages").update({ status }).eq("id", m.id));
    if (!r.ok) {
      messages.setData((all) => (all ?? []).map((x) => (x.id === m.id ? { ...x, status: m.status } : x)));
      return toast.error(r.error);
    }
    refreshCounts();
    if (!quiet) {
      toast.ok(status === "resolved" ? t("Marked as done") : t("Marked as {status}", { status: t(STATUS_LABEL[status]) }), async () => {
        await run(db.from("contact_messages").update({ status: m.status }).eq("id", m.id));
        messages.setData((all) => (all ?? []).map((x) => (x.id === m.id ? { ...x, status: m.status } : x)));
        refreshCounts();
      });
    }
  };

  const open = messages.data?.find((m) => m.id === openId) ?? null;

  /* Opening a new message marks it read, the way an inbox does. */
  useEffect(() => {
    if (open && open.status === "new") void setStatus(open, "read", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (messages.data ?? []).filter((m) => {
      if (filter === "open" && m.status === "resolved") return false;
      if (filter === "new" && m.status !== "new") return false;
      if (filter === "resolved" && m.status !== "resolved") return false;
      if (q && !`${m.first_name} ${m.last_name} ${m.email} ${m.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [messages.data, filter, query]);

  const counts = useMemo(() => {
    const all = messages.data ?? [];
    return {
      open: all.filter((m) => m.status !== "resolved").length,
      new: all.filter((m) => m.status === "new").length,
      resolved: all.filter((m) => m.status === "resolved").length,
      all: all.length,
    };
  }, [messages.data]);

  const wa = whatsappNumber(open?.phone ?? null);

  return (
    <>
      <PageHeader overline={t("02 — Client care")} title={t("Messages.")} subtitle={t("Everything sent through the Contact page. A copy also arrives by email.")} />
      <div className="adm-spread">
        <Chips<Filter>
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: t("To do"), count: counts.open },
            { value: "new", label: t("Unread"), count: counts.new },
            { value: "resolved", label: t("Done"), count: counts.resolved },
            { value: "all", label: t("All"), count: counts.all },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder={t("Search messages")} />
      </div>

      {messages.loading && !messages.data ? (
        <Loading />
      ) : messages.error ? (
        <LoadError message={messages.error} onRetry={messages.reload} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Inbox size={32} />} title={filter === "open" ? t("Nothing to do") : t("No messages here")} body={t("New messages from the website appear here.")} />
      ) : (
        <div className="adm-list">
          {list.map((m) => (
            <button key={m.id} type="button" className="adm-list-row" onClick={() => navigate("messages", m.id)}>
              <span className="adm-list-main">
                <span className="adm-list-title" style={m.status === "new" ? { fontWeight: 700 } : undefined}>{`${m.first_name} ${m.last_name}`.trim() || m.email}</span>
                <span className="adm-list-meta">{m.message.slice(0, 120)}{m.message.length > 120 ? "…" : ""}</span>
              </span>
              <span className="adm-list-side">
                <span className="adm-muted adm-small">{ago(m.created_at)}</span>
                <Badge tone={STATUS_TONE[m.status]}>{t(STATUS_LABEL[m.status])}</Badge>
              </span>
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={openId !== null}
        onClose={() => navigate("messages")}
        title={open ? `${open.first_name} ${open.last_name}`.trim() || open.email : t("Message")}
        footer={
          open && (
            <>
              {open.status !== "resolved" ? (
                <Button variant="primary" icon={<CheckCheck size={16} />} onClick={() => { void setStatus(open, "resolved"); navigate("messages"); }}>{t("Mark as done")}</Button>
              ) : (
                <Button onClick={() => setStatus(open, "read")}>{t("Move back to to-do")}</Button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            <p className="adm-overline">{dateTime(open.created_at)}</p>
            <div className="adm-card">
              <p style={{ whiteSpace: "pre-wrap", fontSize: 18, lineHeight: 1.5 }}>{open.message}</p>
            </div>
            <div className="adm-card">
              <p className="adm-overline">{t("Contact")}</p>
              <span dir="ltr" style={{ overflowWrap: "anywhere" }}>{open.email}</span>
              {open.phone && <span dir="ltr">{open.phone}</span>}
              <div className="adm-row">
                <a className="adm-btn adm-btn-primary" href={`mailto:${open.email}?subject=${encodeURIComponent(t("Re: your message to Mantel"))}&body=${encodeURIComponent(`\n\n> ${open.message.split("\n").join("\n> ")}`)}`}>
                  <Mail size={16} /> {t("Reply by email")}
                </a>
                {wa && <a className="adm-btn" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
                {open.phone && <a className="adm-btn" href={`tel:${open.phone}`}><Phone size={16} /> {t("Call")}</a>}
              </div>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
