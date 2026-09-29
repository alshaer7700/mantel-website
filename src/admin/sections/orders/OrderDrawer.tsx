import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, MessageCircle, Phone, Printer, RotateCcw, XCircle } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAsync } from "@/admin/lib/useAsync";
import { dateTime, money, timeOnly } from "@/admin/lib/format";
import { Button, MoneyField, SelectField, TextArea } from "@/admin/ui/controls";
import { Badge, LoadError, Loading, Notice } from "@/admin/ui/layout";
import { Drawer, Modal, useToast } from "@/admin/ui/overlays";
import {
  CANCEL_REASONS,
  NEXT_STEP,
  STATUS,
  fetchOrder,
  refundOrder,
  setOrderStatus,
  setStaffNote,
  whatsappNumber,
  type Order,
  type OrderStatus,
} from "@/admin/sections/orders/api";

export function OrderDrawer({ orderId, onClose, onChanged }: { orderId: string | null; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const order = useAsync(() => (orderId ? fetchOrder(orderId) : Promise.resolve({ ok: true as const, value: null as unknown as Order })), [orderId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [note, setNote] = useState("");
  const [printing, setPrinting] = useState(false);

  const o = orderId ? order.data : null;

  useEffect(() => {
    setNote(o?.staff_note ?? "");
  }, [o?.id, o?.staff_note]);

  const move = async (to: OrderStatus, reason?: string) => {
    if (!o) return;
    setBusy(to);
    const r = await setOrderStatus(o.id, to, reason);
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    const from = o.status;
    toast.ok(t("{ref} is now “{status}”", { ref: o.reference, status: t(STATUS[to].label) }), async () => {
      await setOrderStatus(o.id, from);
      await order.reload();
      onChanged();
    });
    await order.reload();
    onChanged();
  };

  const saveNote = async () => {
    if (!o) return;
    setBusy("note");
    const r = await setStaffNote(o.id, note);
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Note saved"));
    await order.reload();
  };

  const print = () => {
    setPrinting(true);
    window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 80);
  };

  const wa = whatsappNumber(o?.customer_phone ?? null);
  const next = o ? NEXT_STEP[o.status] : undefined;

  return (
    <Drawer
      open={orderId !== null}
      onClose={onClose}
      title={o ? `${o.reference} · ${o.customer_name}` : t("Order")}
      footer={
        o && (
          <>
            <Button icon={<Printer size={16} />} onClick={print}>{t("Print ticket")}</Button>
            {next && (
              <Button variant="primary" loading={busy === next.to} onClick={() => move(next.to)}>{t(next.label)}</Button>
            )}
          </>
        )
      }
    >
      {order.loading && !o ? (
        <Loading />
      ) : order.error ? (
        <LoadError message={order.error} onRetry={order.reload} />
      ) : !o ? null : (
        <>
          <div className="adm-spread">
            <Badge tone={STATUS[o.status].tone} dot>{t(STATUS[o.status].label)}</Badge>
            <span className="adm-muted adm-small">
              {t("Placed {when}", { when: dateTime(o.created_at) })}
              {o.source !== "online" && ` · ${o.source === "phone" ? t("Phone order") : t("Walk-in")}`}
            </span>
          </div>

          <div className="adm-card">
            <div className="adm-stack" style={{ gap: 6 }}>
              <p className="adm-overline">{t("Pick-up")}</p>
              <strong style={{ fontSize: 22 }}>{o.pickup_at ? timeOnly(o.pickup_at) : t("As soon as it's ready")}</strong>
            </div>
            {o.notes && <Notice tone="warn" title={t("Customer's note")}>{o.notes}</Notice>}
            <table className="adm-table">
              <tbody>
                {o.items.map((item, i) => (
                  <tr key={i}>
                    <td className="adm-num" style={{ width: 40 }}>{item.quantity}×</td>
                    <td>{item.name}</td>
                    <td className="adm-num" style={{ textAlign: "end" }}>{money(item.price * item.quantity)}</td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td className="adm-strong">{t("Total · cash at the counter")}</td>
                  <td className="adm-num adm-strong" style={{ textAlign: "end" }}>{money(o.subtotal)}</td>
                </tr>
                {o.refunded_amount > 0 && (
                  <tr>
                    <td />
                    <td style={{ color: "var(--a-brand)" }}>{t("Refunded")}{o.refund_note ? ` — ${o.refund_note}` : ""}</td>
                    <td className="adm-num" style={{ textAlign: "end", color: "var(--a-brand)" }}>−{money(o.refunded_amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="adm-card">
            <p className="adm-overline">{t("Customer")}</p>
            <div className="adm-stack" style={{ gap: 4 }}>
              <strong style={{ fontSize: 19 }}>{o.customer_name}</strong>
              {o.customer_email && <span dir="ltr" style={{ overflowWrap: "anywhere" }}>{o.customer_email}</span>}
              {o.customer_phone && <span dir="ltr">{o.customer_phone}</span>}
              {typeof o.previous_orders === "number" && o.previous_orders > 0 && (
                <span className="adm-muted adm-small">{t("Has ordered {n} times before", { n: o.previous_orders })}</span>
              )}
            </div>
            <div className="adm-row">
              {wa && (
                <a className="adm-btn adm-btn-sm" href={`https://wa.me/${wa}?text=${encodeURIComponent(t("Hello {name}, your Mantel order {ref} is ready for pickup.", { name: o.customer_name, ref: o.reference }))}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={14} /> {t("WhatsApp")}
                </a>
              )}
              {o.customer_phone && <a className="adm-btn adm-btn-sm" href={`tel:${o.customer_phone}`}><Phone size={14} /> {t("Call")}</a>}
              {o.customer_email && <a className="adm-btn adm-btn-sm" href={`mailto:${o.customer_email}?subject=${encodeURIComponent(`Mantel — ${o.reference}`)}`}><Mail size={14} /> {t("Email")}</a>}
            </div>
          </div>

          <div className="adm-card">
            <p className="adm-overline">{t("Change status")}</p>
            <div className="adm-row">
              {(["received", "preparing", "ready", "completed"] as OrderStatus[]).map((s) => (
                <Button key={s} size="sm" variant={o.status === s ? "primary" : "secondary"} disabled={o.status === s} loading={busy === s} onClick={() => move(s)}>
                  {t(STATUS[s].label)}
                </Button>
              ))}
            </div>
            <div className="adm-row">
              {o.status !== "cancelled" && (
                <Button size="sm" variant="danger" icon={<XCircle size={14} />} onClick={() => setCancelOpen(true)}>{t("Cancel order")}</Button>
              )}
              {o.status === "ready" && (
                <Button size="sm" onClick={() => move("not_collected")}>{t("Not collected")}</Button>
              )}
              {o.status === "completed" && o.refunded_amount < o.subtotal && (
                <Button size="sm" icon={<RotateCcw size={14} />} onClick={() => setRefundOpen(true)}>{t("Record a refund")}</Button>
              )}
            </div>
            {o.cancel_reason && <p className="adm-small adm-muted">{t("Cancelled because: {reason}", { reason: o.cancel_reason })}</p>}
          </div>

          <div className="adm-card">
            <TextArea
              label={t("Note for the team")}
              hint={t("Only staff see this. For example: “Paid, will collect at 5pm”.")}
              value={note}
              onChange={setNote}
              rows={3}
              maxLength={1000}
            />
            <div><Button size="sm" onClick={saveNote} loading={busy === "note"} disabled={note === (o.staff_note ?? "")}>{t("Save note")}</Button></div>
          </div>

          {o.events && o.events.length > 0 && (
            <div className="adm-card">
              <p className="adm-overline">{t("History")}</p>
              <ul className="adm-stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 8 }}>
                {o.events.map((e, i) => (
                  <li key={i} className="adm-spread" style={{ alignItems: "baseline" }}>
                    <span>
                      {e.kind === "status" && e.status ? t("Marked “{status}”", { status: t(STATUS[e.status as OrderStatus]?.label ?? e.status) })
                        : e.kind === "refund" ? t("Refund recorded")
                        : e.kind === "note" ? t("Note updated")
                        : e.kind === "created" ? t("Order entered by staff")
                        : e.kind}
                      {e.note && e.kind !== "note" && <span className="adm-muted"> — {e.note}</span>}
                    </span>
                    <span className="adm-muted adm-small">{e.actor} · {dateTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={async (reason) => { setCancelOpen(false); await move("cancelled", reason); }} reference={o.reference} />
          <RefundModal open={refundOpen} onClose={() => setRefundOpen(false)} order={o} onDone={async () => { setRefundOpen(false); await order.reload(); onChanged(); }} />
          {printing && <PrintTicket order={o} />}
        </>
      )}
    </Drawer>
  );
}

function CancelModal({ open, onClose, onConfirm, reference }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; reference: string }) {
  const t = useT();
  const [reason, setReason] = useState(CANCEL_REASONS[0] ?? "");
  const [other, setOther] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Cancel {ref}?", { ref: reference })}
      footer={<><Button onClick={onClose}>{t("Keep the order")}</Button><Button variant="danger" onClick={() => onConfirm(reason === "other" ? other.trim() : t(reason))}>{t("Cancel order")}</Button></>}
    >
      <SelectField
        label={t("Reason")}
        value={reason}
        onChange={setReason}
        options={[...CANCEL_REASONS.map((r) => ({ value: r, label: t(r) })), { value: "other", label: t("Something else") }]}
      />
      {reason === "other" && <TextArea label={t("What happened?")} value={other} onChange={setOther} rows={2} maxLength={300} />}
      <p className="adm-small adm-muted">{t("Retail items in this order go back into stock.")}</p>
    </Modal>
  );
}

function RefundModal({ open, onClose, order, onDone }: { open: boolean; onClose: () => void; order: Order; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const max = Math.max(order.subtotal - order.refunded_amount, 0);
  const [amount, setAmount] = useState<number | null>(max);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setAmount(max), [max, open]);
  const save = async () => {
    if (!amount || amount <= 0) return toast.error(t("Enter an amount above zero."));
    setBusy(true);
    const r = await refundOrder(order.id, amount, note);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Refund recorded"));
    onDone();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Record a cash refund")}
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" loading={busy} onClick={save}>{t("Record refund")}</Button></>}
    >
      <p>{t("Use this when you give money back at the counter, so the day's totals stay right.")}</p>
      <MoneyField label={t("Amount given back")} value={amount} onChange={setAmount} hint={t("Up to {max}", { max: money(max) })} />
      <TextArea label={t("Why")} optional value={note} onChange={setNote} rows={2} maxLength={200} />
    </Modal>
  );
}

/* A kitchen ticket sized for an 80mm receipt printer; plain paper works too. */
function PrintTicket({ order }: { order: Order }) {
  const t = useT();
  return createPortal(
    <div className="adm-print-area" dir="ltr">
      <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, lineHeight: 1.5, color: "#000", width: "72mm" }}>
        <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700 }}>Mantel.</div>
        <div style={{ textAlign: "center", marginBottom: 8 }}>{order.reference}</div>
        <div>{order.customer_name}</div>
        {order.customer_phone && <div>{order.customer_phone}</div>}
        <div>{t("Placed")}: {dateTime(order.created_at)}</div>
        <div>{t("Pick-up")}: {order.pickup_at ? timeOnly(order.pickup_at) : t("ASAP")}</div>
        <hr style={{ border: 0, borderTop: "1px dashed #000", margin: "8px 0" }} />
        {order.items.map((i, k) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{i.quantity} × {i.name}</span>
            <span>{(i.price * i.quantity).toFixed(3)}</span>
          </div>
        ))}
        <hr style={{ border: 0, borderTop: "1px dashed #000", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
          <span>{t("Total")} BD</span>
          <span>{order.subtotal.toFixed(3)}</span>
        </div>
        {order.notes && <div style={{ marginTop: 8, fontWeight: 700 }}>{t("Note")}: {order.notes}</div>}
      </div>
    </div>,
    document.body,
  );
}
