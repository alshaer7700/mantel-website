import { useEffect, useState } from "react";
import { History, Lock, UserPlus } from "lucide-react";
import { useT } from "@/admin/i18n";
import { roleLabel, useAdmin } from "@/admin/context";
import { useAsync } from "@/admin/lib/useAsync";
import { ago, dateTime } from "@/admin/lib/format";
import { getSetting, rpc, saveSetting } from "@/admin/lib/db";
import type { Area } from "@/admin/nav";
import { Button, EMAIL_RE, SelectField, TextField, Toggle } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, Tabs } from "@/admin/ui/layout";
import { Drawer, Modal, useConfirm, useToast } from "@/admin/ui/overlays";

type Role = "admin" | "manager" | "support";

type Member = {
  user_id: string;
  email: string;
  role: Role;
  active: boolean;
  display_name: string;
  has_pin: boolean;
  last_seen_at: string | null;
  created_at: string;
  two_step: boolean;
  is_me: boolean;
};

type Invite = { email: string; role: Role; display_name: string | null; created_at: string; has_account: boolean };

type Staff = { members: Member[]; invites: Invite[] };

type AuditRow = {
  id: number;
  at: string;
  actor_email: string | null;
  acting_staff_name: string | null;
  action: "insert" | "update" | "delete";
  entity: string;
  entity_id: string | null;
  label: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
};

type Security = { require_2fa: boolean; idle_minutes: number };

const ROLES: { value: Role; label: string; about: string }[] = [
  { value: "admin", label: "Admin", about: "Everything, including the team and security." },
  { value: "manager", label: "Manager", about: "Runs the café and the website. Can't change the team." },
  { value: "support", label: "Support", about: "Orders and messages only. Good for baristas." },
];

const AREAS: { area: Area; label: string; about: string }[] = [
  { area: "orders", label: "Orders", about: "See and update orders, print tickets, take phone orders" },
  { area: "catalog", label: "Menu & retail", about: "Items, prices, photos, sold out" },
  { area: "content", label: "Website pages & photos", about: "Text on the website and the photo library" },
  { area: "settings", label: "Shop settings", about: "Opening hours, pausing orders, announcements" },
  { area: "customers", label: "Customers", about: "Customer list, notes, blocking, privacy requests" },
  { area: "messages", label: "Messages", about: "The contact-form inbox" },
  { area: "marketing", label: "Marketing", about: "Newsletter, promo codes, loyalty" },
  { area: "reports", label: "Reports", about: "Sales numbers and downloads" },
  { area: "payments", label: "Payments", about: "Card payments and refunds" },
  { area: "system", label: "Site health", about: "Errors, email delivery, backups" },
  { area: "staff", label: "Team", about: "Invite people and change what they can do" },
];

const ENTITY_LABEL: Record<string, string> = {
  menu_items: "Menu item",
  menu_categories: "Menu category",
  option_groups: "Option group",
  option_choices: "Option",
  objects: "Retail product",
  orders: "Order",
  site_settings: "Shop setting",
  site_content: "Website text",
  media_library: "Photo",
  staff_members: "Team member",
  staff_invites: "Invite",
  staff_role_permissions: "Role permission",
  customer_notes: "Customer note",
  invoices: "Invoice",
  documents: "Document",
};

type Tab = "people" | "roles" | "security" | "activity";

export function TeamSection() {
  const t = useT();
  const { rest, navigate } = useAdmin();
  const tab = (["people", "roles", "security", "activity"].includes(rest[0] ?? "") ? rest[0] : "people") as Tab;
  return (
    <>
      <PageHeader overline={t("06 — Behind the counter")} title={t("Team.")} subtitle={t("Who can open this dashboard, and what each person can do.")} />
      <Tabs
        label={t("Team sections")}
        value={tab}
        onChange={(v) => navigate("team", v === "people" ? null : v)}
        tabs={[
          { value: "people", label: t("People") },
          { value: "roles", label: t("What each role can do") },
          { value: "security", label: t("Security") },
          { value: "activity", label: t("Activity log") },
        ]}
      />
      {tab === "people" ? <People /> : tab === "roles" ? <Roles /> : tab === "security" ? <SecurityPanel /> : <Activity />}
    </>
  );
}

function People() {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { reloadMe } = useAdmin();
  const staff = useAsync(() => rpc<Staff>("admin_staff"), []);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const cancelInvite = async (i: Invite) => {
    const ok = await confirm({ title: t("Cancel the invite for {email}?", { email: i.email }), confirmLabel: t("Cancel invite"), danger: true });
    if (!ok) return;
    const r = await rpc("admin_cancel_invite", { p_email: i.email });
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Invite cancelled"));
    await staff.reload();
  };

  if (staff.loading && !staff.data) return <Loading />;
  if (staff.error) return <LoadError message={staff.error} onRetry={staff.reload} />;
  const { members = [], invites = [] } = staff.data ?? {};

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <Card
        title={t("People")}
        subtitle={t("{n} people can open the dashboard", { n: members.filter((m) => m.active).length })}
        actions={<Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>{t("Add a person")}</Button>}
      >
        <div className="adm-list">
          {members.map((m) => (
            <button key={m.user_id} type="button" className="adm-list-row" onClick={() => setEditing(m)}>
              <span className="adm-list-main">
                <span className="adm-list-title">{m.display_name}{m.is_me ? ` · ${t("you")}` : ""}</span>
                <span className="adm-list-meta" dir="ltr" style={{ textAlign: "start" }}>{m.email}</span>
                <span className="adm-list-meta">{m.last_seen_at ? t("Last seen {when}", { when: ago(m.last_seen_at) }) : t("Hasn't signed in yet")}</span>
              </span>
              <span className="adm-list-side">
                {!m.active && <Badge tone="danger">{t("Switched off")}</Badge>}
                {m.two_step && <Badge tone="ok">{t("Two-step on")}</Badge>}
                {m.has_pin && <Badge>{t("Counter PIN")}</Badge>}
                <Badge tone="dark">{t(roleLabel(m.role))}</Badge>
              </span>
            </button>
          ))}
        </div>
      </Card>

      {invites.length > 0 && (
        <Card title={t("Waiting to join")} subtitle={t("They join automatically the first time they sign in with this email.")}>
          <div className="adm-list">
            {invites.map((i) => (
              <div key={i.email} className="adm-list-row">
                <span className="adm-list-main">
                  <span className="adm-list-title" dir="ltr" style={{ textAlign: "start" }}>{i.email}</span>
                  <span className="adm-list-meta">
                    {t(roleLabel(i.role))} · {t("Invited {when}", { when: ago(i.created_at) })} · {i.has_account ? t("Has an account — just needs to open the dashboard") : t("Needs to create an account first")}
                  </span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => cancelInvite(i)}>{t("Cancel invite")}</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={staff.reload} />
      {editing && (
        <MemberDrawer
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await staff.reload();
            await reloadMe();
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("support");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"added" | "invited" | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setRole("support");
      setResult(null);
    }
  }, [open]);

  const valid = EMAIL_RE.test(email.trim());
  const submit = async () => {
    setSaving(true);
    const r = await rpc<"added" | "invited">("admin_invite_staff", { p_email: email.trim(), p_role: role, p_name: name.trim() });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    setResult(r.value);
    onDone();
  };

  const site = typeof window !== "undefined" ? window.location.origin : "https://bymantel.com";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Add a person to the team")}
      footer={result ? (
        <Button variant="primary" onClick={onClose}>{t("Done")}</Button>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={!valid}>{t("Add to the team")}</Button>
        </>
      )}
    >
      {result ? (
        <Notice tone="ok" title={result === "added" ? t("{email} is on the team", { email: email.trim() }) : t("Invite saved for {email}", { email: email.trim() })}>
          {result === "added"
            ? t("They already have an account. They can open {url} now.", { url: `${site}/admin` })
            : t("Ask them to create an account on {site} with this exact email, then open {url}. They'll be let in automatically.", { site, url: `${site}/admin` })}
        </Notice>
      ) : (
        <div className="adm-stack">
          <TextField label={t("Their email")} type="email" value={email} onChange={setEmail} dir="ltr" autoComplete="off" />
          <TextField label={t("Their name")} optional value={name} onChange={setName} maxLength={60} />
          <SelectField label={t("Role")} value={role} onChange={(v) => setRole(v as Role)} options={ROLES.map((r) => ({ value: r.value, label: `${t(r.label)} — ${t(r.about)}` }))} />
        </div>
      )}
    </Modal>
  );
}

function MemberDrawer({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState(member.display_name);
  const [role, setRole] = useState<Role>(member.role);
  const [active, setActive] = useState(member.active);
  const [saving, setSaving] = useState(false);
  const dirty = name !== member.display_name || role !== member.role || active !== member.active;

  const save = async () => {
    if (!active && member.active) {
      const ok = await confirm({
        title: t("Switch off {name}'s access?", { name: member.display_name }),
        body: t("They won't be able to open the dashboard or use their counter PIN. You can switch them back on at any time."),
        confirmLabel: t("Switch off"),
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    const r = await rpc("admin_update_staff", { p_user_id: member.user_id, p_role: role, p_active: active, p_name: name.trim() });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Saved"));
    onSaved();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={member.display_name}
      footer={<Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>{t("Save changes")}</Button>}
    >
      <div className="adm-stack" style={{ gap: 18 }}>
        <span className="adm-muted" dir="ltr" style={{ textAlign: "start" }}>{member.email}</span>
        <TextField label={t("Name")} value={name} onChange={setName} maxLength={60} />
        <SelectField label={t("Role")} value={role} onChange={(v) => setRole(v as Role)} options={ROLES.map((r) => ({ value: r.value, label: t(r.label) }))} hint={t(ROLES.find((r) => r.value === role)?.about ?? "")} />
        <Toggle
          label={t("Can open the dashboard")}
          description={t("Switch off when someone leaves. Their history stays in the activity log.")}
          checked={active}
          onChange={setActive}
          disabled={member.is_me}
        />
        {member.is_me && <p className="adm-small adm-muted">{t("You can't switch off your own access.")}</p>}
        <div className="adm-stack" style={{ gap: 4 }}>
          <span className="adm-small adm-muted">{t("Joined {date}", { date: dateTime(member.created_at) })}</span>
          <span className="adm-small adm-muted">{member.two_step ? t("Two-step sign-in is on.") : t("Two-step sign-in is off.")}</span>
          <span className="adm-small adm-muted">{member.has_pin ? t("Has a counter PIN.") : t("No counter PIN yet.")}</span>
        </div>
      </div>
    </Drawer>
  );
}

function Roles() {
  const t = useT();
  const toast = useToast();
  const { reloadMe } = useAdmin();
  const perms = useAsync(() => rpc<Record<string, boolean>>("admin_permissions"), []);

  const set = async (role: Role, area: Area, allowed: boolean) => {
    const key = `${role}:${area}`;
    perms.setData((p) => ({ ...(p ?? {}), [key]: allowed }));
    const r = await rpc("admin_set_permission", { p_role: role, p_area: area, p_allowed: allowed });
    if (!r.ok) {
      perms.setData((p) => ({ ...(p ?? {}), [key]: !allowed }));
      return toast.error(r.error);
    }
    toast.ok(t("Saved"));
    void reloadMe();
  };

  if (perms.loading && !perms.data) return <Loading />;
  if (perms.error) return <LoadError message={perms.error} onRetry={perms.reload} />;
  const p = perms.data ?? {};

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <Notice title={t("Admins can always do everything")}>{t("So there's always someone who can fix access. Change what managers and support staff can open below.")}</Notice>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t("Area")}</th>
              <th>{t("Manager")}</th>
              <th>{t("Support")}</th>
            </tr>
          </thead>
          <tbody>
            {AREAS.map((a) => (
              <tr key={a.area}>
                <td>
                  <div className="adm-strong">{t(a.label)}</div>
                  <div className="adm-small adm-muted">{t(a.about)}</div>
                </td>
                {(["manager", "support"] as const).map((role) => (
                  <td key={role}>
                    <Toggle
                      label={<span className="sr-only">{t("{role} can use {area}", { role: t(roleLabel(role)), area: t(a.label) })}</span>}
                      checked={Boolean(p[`${role}:${a.area}`])}
                      onChange={(v) => set(role, a.area, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const t = useT();
  const toast = useToast();
  const { reloadMe } = useAdmin();
  const settings = useAsync(() => getSetting<Security>("security", { require_2fa: false, idle_minutes: 0 }), []);
  const [draft, setDraft] = useState<Security | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  if (settings.loading && !settings.data) return <Loading />;
  if (settings.error) return <LoadError message={settings.error} onRetry={settings.reload} />;
  if (!draft) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.data);

  const save = async () => {
    setSaving(true);
    const r = await saveSetting("security", draft, false);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Security settings saved"));
    await settings.reload();
    await reloadMe();
  };

  return (
    <Card title={t("Sign-in security")} subtitle={t("Applies to everyone on the team.")}>
      <div className="adm-stack" style={{ gap: 18 }}>
        <Toggle
          label={t("Everyone must use two-step sign-in")}
          description={t("After their password, each person also enters a 6-digit code from an app on their phone. People who haven't set it up will be asked to the next time they sign in.")}
          checked={draft.require_2fa}
          onChange={(v) => setDraft({ ...draft, require_2fa: v })}
        />
        <SelectField
          label={t("Sign out automatically after")}
          value={String(draft.idle_minutes)}
          onChange={(v) => setDraft({ ...draft, idle_minutes: Number(v) })}
          hint={t("For a shared computer at the counter. Counter tablets using a PIN lock separately.")}
          options={[
            { value: "0", label: t("Never") },
            { value: "15", label: t("15 minutes without use") },
            { value: "30", label: t("30 minutes without use") },
            { value: "60", label: t("1 hour without use") },
            { value: "240", label: t("4 hours without use") },
          ]}
        />
        <div><Button variant="primary" icon={<Lock size={16} />} onClick={save} loading={saving} disabled={!dirty}>{t("Save changes")}</Button></div>
      </div>
    </Card>
  );
}

function describeValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

function Activity() {
  const t = useT();
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [limit, setLimit] = useState(100);
  const log = useAsync(() => rpc<{ rows: AuditRow[]; actors: string[] }>("admin_activity", { p_entity: entity || null, p_actor: actor || null, p_limit: limit, p_offset: 0 }), [entity, actor, limit]);
  const [open, setOpen] = useState<AuditRow | null>(null);

  const verb = (a: AuditRow["action"]) => (a === "insert" ? t("added") : a === "delete" ? t("deleted") : t("changed"));

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-row" style={{ flexWrap: "wrap" }}>
        <SelectField
          label={t("What")}
          value={entity}
          onChange={setEntity}
          options={[{ value: "", label: t("Everything") }, ...Object.entries(ENTITY_LABEL).map(([value, label]) => ({ value, label: t(label) }))]}
        />
        <SelectField
          label={t("Who")}
          value={actor}
          onChange={setActor}
          options={[{ value: "", label: t("Everyone") }, ...(log.data?.actors ?? []).map((a) => ({ value: a, label: a }))]}
        />
      </div>
      {log.loading && !log.data ? (
        <Loading />
      ) : log.error ? (
        <LoadError message={log.error} onRetry={log.reload} />
      ) : (log.data?.rows ?? []).length === 0 ? (
        <EmptyState icon={<History size={32} />} title={t("Nothing recorded yet")} body={t("Every change made in the dashboard is written here: who, what and when.")} />
      ) : (
        <>
          <div className="adm-list" style={{ border: "1px solid var(--a-line)", background: "var(--a-surface)" }}>
            {(log.data?.rows ?? []).map((row) => {
              const who = row.acting_staff_name || row.actor_email || t("The system");
              const fields = Object.keys(row.changes ?? {});
              return (
                <button key={row.id} type="button" className="adm-list-row" onClick={() => setOpen(row)}>
                  <span className="adm-list-main">
                    <span className="adm-list-title">
                      {who} {verb(row.action)} {t(ENTITY_LABEL[row.entity] ?? row.entity).toLowerCase()} {row.label && row.label !== row.entity_id ? `“${row.label}”` : ""}
                    </span>
                    {fields.length > 0 && <span className="adm-list-meta">{fields.slice(0, 4).join(", ")}{fields.length > 4 ? "…" : ""}</span>}
                  </span>
                  <span className="adm-small adm-muted" title={dateTime(row.at)}>{ago(row.at)}</span>
                </button>
              );
            })}
          </div>
          {(log.data?.rows ?? []).length >= limit && limit < 300 && (
            <div><Button onClick={() => setLimit((l) => Math.min(300, l + 100))} loading={log.loading}>{t("Show more")}</Button></div>
          )}
        </>
      )}
      <Drawer open={!!open} onClose={() => setOpen(null)} title={t("Change details")}>
        {open && (
          <div className="adm-stack" style={{ gap: 12 }}>
            <p>{dateTime(open.at)} · {open.acting_staff_name || open.actor_email || t("The system")}</p>
            <p className="adm-muted">{t(ENTITY_LABEL[open.entity] ?? open.entity)} · {open.label ?? open.entity_id}</p>
            {open.changes && Object.keys(open.changes).length > 0 ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr><th>{t("Field")}</th><th>{t("Before")}</th><th>{t("After")}</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(open.changes).map(([field, c]) => (
                      <tr key={field}>
                        <td>{field}</td>
                        <td className="adm-muted">{describeValue(c?.from)}</td>
                        <td>{describeValue(c?.to)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="adm-muted">{open.action === "insert" ? t("This was newly added.") : open.action === "delete" ? t("This was deleted.") : t("No field details were recorded.")}</p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
