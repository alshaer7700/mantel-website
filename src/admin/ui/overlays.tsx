import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useT } from "@/admin/i18n";
import { Button, IconButton } from "@/admin/ui/controls";

/*
 * Pop-ups for the dashboard. Portalled into the .adm root (not document.body)
 * so they inherit the dashboard's theme, language direction and fonts.
 */

export const PortalRootContext = createContext<HTMLElement | null>(null);

function usePortalRoot() {
  return useContext(PortalRootContext) ?? document.body;
}

/* Open pop-ups, newest last. Only the top one answers Escape and Tab, so
   Escape in "Cancel order" closes that pop-up and leaves the order open. */
const openTraps: object[] = [];

function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const trap = {};
    openTraps.push(trap);
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (openTraps[openTraps.length - 1] !== trap) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) return;
        const firstItem = items[0]!;
        const lastItem = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openTraps.splice(openTraps.indexOf(trap), 1);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);
  return ref;
}

type ModalProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  const t = useT();
  const root = usePortalRoot();
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="adm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`adm-modal ${wide ? "adm-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="adm-modal-head">
          <h2 className="adm-modal-title">{title}</h2>
          <IconButton label={t("Close")} onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-foot">{footer}</div>}
      </div>
    </div>,
    root,
  );
}

type DrawerProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  headerExtra?: ReactNode;
};

export function Drawer({ open, title, onClose, children, footer, wide, headerExtra }: DrawerProps) {
  const t = useT();
  const root = usePortalRoot();
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="adm-drawer-overlay" onClick={onClose} />
      <div ref={ref} className={`adm-drawer ${wide ? "adm-drawer-wide" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="adm-drawer-head">
          <IconButton label={t("Close")} onClick={onClose}><X size={18} /></IconButton>
          <h2 className="adm-drawer-title">{title}</h2>
          {headerExtra}
        </div>
        <div className="adm-drawer-body">{children}</div>
        {footer && <div className="adm-drawer-foot">{footer}</div>}
      </div>
    </>,
    root,
  );
}

/* ── Confirm ─────────────────────────────────────────────────────────────── */

type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Ask the person to type this word before the button unlocks. */
  typeToConfirm?: string;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState("");
  const confirm = useCallback<ConfirmFn>((options) => new Promise<boolean>((resolve) => {
    setTyped("");
    setState({ ...options, resolve });
  }), []);
  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };
  const locked = Boolean(state?.typeToConfirm) && typed.trim().toLowerCase() !== state?.typeToConfirm?.toLowerCase();
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state !== null}
        title={state?.title ?? ""}
        onClose={() => close(false)}
        footer={
          <>
            <Button onClick={() => close(false)}>{state?.cancelLabel ?? t("Cancel")}</Button>
            <Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)} disabled={locked} data-autofocus>
              {state?.confirmLabel ?? t("Yes, continue")}
            </Button>
          </>
        }
      >
        {state?.body && <div className="adm-stack">{typeof state.body === "string" ? <p>{state.body}</p> : state.body}</div>}
        {state?.typeToConfirm && (
          <label className="adm-field">
            <span className="adm-label">{t('Type "{word}" to confirm', { word: state.typeToConfirm })}</span>
            <input className="adm-input" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </label>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/* ── Toasts ──────────────────────────────────────────────────────────────── */

type Toast = { id: number; message: string; tone: "ok" | "error"; undo?: () => void | Promise<void> };
type ToastApi = {
  ok: (message: string, undo?: () => void | Promise<void>) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi>({ ok: () => {}, error: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((x) => x.id !== id)), []);
  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-2), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), toast.undo ? 8000 : toast.tone === "error" ? 7000 : 3500);
  }, [dismiss]);
  const api = useRef<ToastApi>({ ok: () => {}, error: () => {} });
  api.current.ok = (message, undo) => push({ message, tone: "ok", undo });
  api.current.error = (message) => push({ message, tone: "error" });
  const stable = useRef<ToastApi>({
    ok: (m, u) => api.current.ok(m, u),
    error: (m) => api.current.error(m),
  });
  return (
    <ToastContext.Provider value={stable.current}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`adm-toast ${toast.tone === "error" ? "adm-toast-error" : ""}`}>
            <p>{toast.message}</p>
            {toast.undo && (
              <button type="button" onClick={async () => { dismiss(toast.id); await toast.undo?.(); }}>{t("Undo")}</button>
            )}
            <button type="button" onClick={() => dismiss(toast.id)} aria-label={t("Dismiss")}><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
