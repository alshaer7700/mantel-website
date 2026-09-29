import { useEffect, useState } from "react";
import { Download, Mail, MessageCircle, Phone, Trash2, Users } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync } from "@/admin/lib/useAsync";
import { ago, bahrainToday, dateOnly, dateTime, downloadFile, money, toCsv } from "@/admin/lib/format";
import { rpc } from "@/admin/lib/db";
import { Button, Chips, SearchInput, TagInput, TextArea, TextField, Toggle } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, Stat } from "@/admin/ui/layout";
import { Drawer, useConfirm, useToast } from "@/admin/ui/overlays";
import { STATUS, normalizeOrder, whatsappNumber, type Order } from "@/admin/sections/orders/api";

type CustomerRow = {
  email: string;
  name: string;
  phone: string | null;
  has_account: boolean;
  orders: number;
  spent: number;
  first_order: string | null;
  last_order: string | null;
  no_shows: number;
  tags: string[];
  blocked: boolean;
  subscribed: boolean;
};

type CustomerList = { total: number; rows: CustomerRow[]; tags: string[] };

type CustomerDetail = {
  email: string;
  account: { created_at: string; name: string | null; phone: string | null; last_sign_in: string | null } | null;
  notes: { tags: string[]; note: string | null; blocked: boolean; block_reason: string | null } | null;
  subscription: { status: string; subscribed_at: string } | null;
  orders: Order[];
  messages: { id: string; message: string; status: string; created_at: string }[];
  favourites: { name: string; quantity: number }[];
};

const PAGE = 50;

/** A regular is someone who has come back at least three times. */
const REGULAR_AT = 3;

export function CustomersSection() {
  const t = useT();
  const { rest, navigate } = useAdmin();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const openEmail = rest[0] ? decodeURIComponent(rest[0]) : null;

  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const list = useAsync(
    () => rpc<CustomerList>("admin_customers", { p_query: search || null, p_filter: filter === "all" ? null : filter, p_limit: limit, p_offset: 0 }),
    [search, filter, limit],
  );
  const rows = (list.data?.rows ?? []).map((r) => ({ ...r, spent: Number(r.spent) }));

  const exportList = () =>
    downloadFile(
      `mantel-customers-${bahrainToday()}.csv`,
      toCsv(
        rows.map((r) => ({
          name: r.name, email: r.email, phone: r.phone ?? "", orders: r.orders, spent: r.spent.toFixed(3),
          first_order: dateOnly(r.first_order), last_order: dateOnly(r.last_order), tags: r.tags.join(" "),
          newsletter: r.subscribed ? "yes" : "no", blocked: r.blocked ? "yes" : "no",
        })),
      ),
    );

  return (
    <>
      <PageHeader
        overline={t("04 — Your guests")}
        title={t("Customers.")}
        subtitle={t("Everyone who has ordered, with their history, notes and privacy requests.")}
        help={t("Customers are grouped by email address. Guests who order without an account appear too.")}
        actions={<Button icon={<Download size={16} />} disabled={!rows.length} onClick={exportList}>{t("Download spreadsheet")}</Button>}
      />

      <div className="adm-spread">
        <Chips
          label={t("Show")}
          value={filter}
          onChange={(v) => { setFilter(v); setLimit(PAGE); }}
          options={[
            { value: "all", label: t("Everyone") },
            { value: "regulars", label: t("Regulars") },
            { value: "new", label: t("New this month") },
            { value: "subscribed", label: t("On the newsletter") },
            { value: "blocked", label: t("Blocked") },
            ...(list.data?.tags ?? []).map((tag) => ({ value: `tag:${tag}`, label: `#${tag}` })),
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder={t("Search name, email or phone")} />
      </div>

      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <LoadError message={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title={search ? t("No one matches that search") : t("No customers here yet")} body={t("Anyone who places an order appears here.")} />
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table adm-cards adm-cards-customers">
              <thead>
                <tr>
                  <th>{t("Customer")}</th>
                  <th className="adm-num">{t("Orders")}</th>
                  <th className="adm-num">{t("Spent")}</th>
                  <th>{t("Last visit")}</th>
                  <th>{t("Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email} className="is-clickable" onClick={() => navigate("customers", encodeURIComponent(r.email))}>
                    <td>
                      <div className="adm-strong">{r.name}</div>
                      <div className="adm-small adm-muted" dir="ltr" style={{ textAlign: "start" }}>{r.email}</div>
                    </td>
                    <td className="adm-num" data-label={t("Orders")}>{r.orders}</td>
                    <td className="adm-num">{money(r.spent)}</td>
                    <td data-label={t("Last visit")}>{r.last_order ? ago(r.last_order) : "—"}</td>
                    <td>
                      <div className="adm-row" style={{ gap: 6, flexWrap: "wrap" }}>
                        {r.blocked && <Badge tone="danger">{t("Blocked")}</Badge>}
                        {r.orders >= REGULAR_AT && <Badge tone="ok">{t("Regular")}</Badge>}
                        {r.no_shows > 0 && <Badge tone="warn">{t("{n} not collected", { n: r.no_shows })}</Badge>}
                        {r.subscribed && <Badge>{t("Newsletter")}</Badge>}
                        {r.tags.map((tag) => <Badge key={tag} tone="info">#{tag}</Badge>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="adm-spread">
            <span className="adm-small adm-muted">{t("Showing {n} of {total}", { n: rows.length, total: list.data?.total ?? 0 })}</span>
            {(list.data?.total ?? 0) > rows.length && <Button onClick={() => setLimit((l) => l + PAGE)} loading={list.loading}>{t("Show more")}</Button>}
          </div>
        </>
      )}

      {openEmail && <CustomerDrawer email={openEmail} onClose={() => navigate("customers")} onChanged={list.reload} />}
    </>
  );
}

function CustomerDrawer({ email, onClose, onChanged }: { email: string; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { navigate } = useAdmin();
  const detail = useAsync(() => rpc<CustomerDetail>("admin_customer", { p_email: email }), [email]);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const n = detail.data?.notes;
    setTags(n?.tags ?? []);
    setNote(n?.note ?? "");
    setBlocked(n?.blocked ?? false);
    setReason(n?.block_reason ?? "");
  }, [detail.data]);

  const d = detail.data;
  const orders = (d?.orders ?? []).map(normalizeOrder);
  const sold = orders.filter((o) => o.status !== "cancelled");
  const spent = sold.reduce((s, o) => s + o.subtotal - o.refunded_amount, 0);
  const name = d?.account?.name || orders[0]?.customer_name || email.split("@")[0];
  const phone = orders.find((o) => o.customer_phone)?.customer_phone ?? d?.account?.phone ?? null;
  const wa = whatsappNumber(phone);
  const saved = d?.notes;
  const dirty = JSON.stringify(tags) !== JSON.stringify(saved?.tags ?? []) || note !== (saved?.note ?? "") || blocked !== (saved?.blocked ?? false) || reason !== (saved?.block_reason ?? "");

  const save = async () => {
    setSaving(true);
    const r = await rpc("admin_set_customer_notes", { p_email: email, p_tags: tags, p_note: note, p_blocked: blocked, p_reason: reason });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Saved"));
    await detail.reload();
    onChanged();
  };

  const exportData = async () => {
    const r = await rpc<unknown>("admin_customer_export", { p_email: email });
    if (!r.ok) return toast.error(r.error);
    downloadFile(`mantel-data-${email.replace(/[^a-z0-9]+/gi, "-")}.json`, JSON.stringify(r.value, null, 2), "application/json");
    toast.ok(t("Their data was downloaded. Send the file to them by email."));
  };

  const forget = async () => {
    const ok = await confirm({
      title: t("Delete this customer's personal data?"),
      body: t("Their name, email and phone are removed from past orders, and their messages, newsletter sign-up, notes and account are deleted. Sales totals stay. This can't be undone."),
      confirmLabel: t("Delete their data"),
      danger: true,
      typeToConfirm: "DELETE",
    });
    if (!ok) return;
    const r = await rpc<{ orders: number; messages: number; account: boolean }>("admin_customer_forget", { p_email: email });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Personal data deleted from {n} orders", { n: r.value.orders }));
    onChanged();
    onClose();
  };

  return (
    <Drawer
      open
      wide
      onClose={onClose}
      title={name}
      footer={dirty ? (
        <div className="adm-row" style={{ justifyContent: "flex-end", width: "100%" }}>
          <Button variant="primary" onClick={save} loading={saving}>{t("Save changes")}</Button>
        </div>
      ) : undefined}
    >
      {detail.loading && !d ? (
        <Loading />
      ) : detail.error ? (
        <LoadError message={detail.error} onRetry={detail.reload} />
      ) : d && (
        <div className="adm-stack" style={{ gap: 20 }}>
          <div className="adm-stack" style={{ gap: 4 }}>
            <span dir="ltr" style={{ textAlign: "start" }}>{email}</span>
            {phone && <span className="adm-muted" dir="ltr" style={{ textAlign: "start" }}>{phone}</span>}
            <div className="adm-row" style={{ gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {d.account ? <Badge tone="ok">{t("Has an account")}</Badge> : <Badge>{t("Guest")}</Badge>}
              {d.subscription?.status === "active" && <Badge>{t("Newsletter")}</Badge>}
              {saved?.blocked && <Badge tone="danger">{t("Blocked")}</Badge>}
            </div>
          </div>

          <div className="adm-row" style={{ flexWrap: "wrap" }}>
            <Button size="sm" icon={<Mail size={14} />} onClick={() => window.open(`mailto:${email}`)}>{t("Email")}</Button>
            {phone && <Button size="sm" icon={<Phone size={14} />} onClick={() => window.open(`tel:${phone}`)}>{t("Call")}</Button>}
            {wa && <Button size="sm" icon={<MessageCircle size={14} />} onClick={() => window.open(`https://wa.me/${wa}`, "_blank", "noopener")}>{t("WhatsApp")}</Button>}
          </div>

          <div className="adm-grid-3">
            <Stat label={t("Orders")} value={sold.length} note={d.account ? t("Joined {date}", { date: dateOnly(d.account.created_at) }) : undefined} />
            <Stat label={t("Spent")} value={money(spent)} />
            <Stat label={t("Average order")} value={money(sold.length ? spent / sold.length : 0)} />
          </div>

          {d.favourites.length > 0 && (
            <Card title={t("Usually orders")}>
              <div className="adm-row" style={{ flexWrap: "wrap", gap: 6 }}>
                {d.favourites.map((f) => <Badge key={f.name}>{f.name} × {f.quantity}</Badge>)}
              </div>
            </Card>
          )}

          <Card title={t("Notes for the team")} subtitle={t("Only staff can see these.")}>
            <div className="adm-stack">
              <TagInput label={t("Tags")} value={tags} onChange={setTags} placeholder={t("e.g. vip, oat-milk")} hint={t("Press Enter after each tag. Tags become filters on the list.")} />
              <TextArea label={t("Note")} value={note} onChange={setNote} rows={3} placeholder={t("e.g. Always asks for extra hot")} />
              <Toggle
                label={t("Block online orders")}
                description={t("They won't be able to place orders on the website.")}
                checked={blocked}
                onChange={setBlocked}
              />
              {blocked && <TextField label={t("Reason")} optional value={reason} onChange={setReason} placeholder={t("e.g. Three orders not collected")} />}
            </div>
          </Card>

          <Card title={t("Orders")} subtitle={orders.length ? t("{n} orders", { n: orders.length }) : undefined}>
            {orders.length === 0 ? (
              <p className="adm-muted">{t("No orders yet.")}</p>
            ) : (
              <div className="adm-list">
                {orders.slice(0, 30).map((o) => (
                  <button key={o.id} type="button" className="adm-list-row" onClick={() => navigate("orders", o.id)}>
                    <span className="adm-list-main">
                      <span className="adm-list-title">{o.reference} · {money(o.subtotal)}</span>
                      <span className="adm-list-meta">{dateTime(o.created_at)} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
                    </span>
                    <Badge tone={STATUS[o.status].tone}>{t(STATUS[o.status].label)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {d.messages.length > 0 && (
            <Card title={t("Messages")}>
              <div className="adm-list">
                {d.messages.map((m) => (
                  <button key={m.id} type="button" className="adm-list-row" onClick={() => navigate("messages", m.id)}>
                    <span className="adm-list-main">
                      <span className="adm-list-meta">{m.message.slice(0, 140)}{m.message.length > 140 ? "…" : ""}</span>
                    </span>
                    <span className="adm-small adm-muted">{ago(m.created_at)}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card title={t("Privacy")} subtitle={t("For when a customer asks what you hold about them, or asks you to delete it.")}>
            <div className="adm-stack">
              <div className="adm-row" style={{ flexWrap: "wrap" }}>
                <Button icon={<Download size={16} />} onClick={exportData}>{t("Download their data")}</Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={forget}>{t("Delete their data")}</Button>
              </div>
              {saved?.blocked && (
                <Notice tone="warn" title={t("Blocked from ordering online")}>
                  {saved.block_reason || t("No reason given.")}
                </Notice>
              )}
            </div>
          </Card>
        </div>
      )}
    </Drawer>
  );
}
