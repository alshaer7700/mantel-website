import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, OctagonAlert } from "lucide-react";
import { useT } from "@/admin/i18n";
import { Button, HelpTip } from "@/admin/ui/controls";

export function PageHeader({ title, subtitle, actions, help }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; help?: ReactNode }) {
  return (
    <header className="adm-page-head">
      <div>
        <div className="adm-row" style={{ gap: 10 }}>
          <h1 className="adm-page-title">{title}</h1>
          {help && <HelpTip>{help}</HelpTip>}
        </div>
        {subtitle && <p className="adm-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="adm-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, subtitle, actions, children, className = "" }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || actions) && (
        <div className="adm-card-head">
          <div className="adm-stack" style={{ gap: 2 }}>
            {title && <h2 className="adm-card-title">{title}</h2>}
            {subtitle && <p className="adm-card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="adm-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children, dot }: { tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "dark"; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`adm-badge ${tone !== "neutral" ? `adm-badge-${tone}` : ""}`}>
      {dot && <span className="adm-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Notice({ tone = "info", title, children, action }: { tone?: "info" | "warn" | "danger" | "ok"; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : tone === "danger" ? OctagonAlert : tone === "ok" ? CheckCircle2 : Info;
  return (
    <div className={`adm-notice ${tone !== "info" ? `adm-notice-${tone}` : ""}`} role={tone === "danger" ? "alert" : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div className="adm-small">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      {icon}
      <strong>{title}</strong>
      {body && <p style={{ maxWidth: "46ch" }}>{body}</p>}
      {action}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="adm-loading" role="status">
      <Loader2 size={18} className="adm-spin" aria-hidden="true" />
      {label ?? t("Loading…")}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <Notice tone="danger" title={t("This didn't load")} action={onRetry && <Button size="sm" onClick={onRetry}>{t("Try again")}</Button>}>
      {message}
    </Notice>
  );
}

export function Stat({ label, value, note, alert, onClick }: { label: ReactNode; value: ReactNode; note?: ReactNode; alert?: boolean; onClick?: () => void }) {
  const cls = `adm-stat ${alert ? "is-alert" : ""}`;
  const body = (
    <>
      <span className="adm-stat-label">{label}</span>
      <span className="adm-stat-value">{value}</span>
      {note && <span className="adm-stat-note">{note}</span>}
    </>
  );
  return onClick ? <button type="button" className={cls} onClick={onClick}>{body}</button> : <div className={cls}>{body}</div>;
}

export function Tabs<T extends string>({ value, onChange, tabs, label }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[]; label: string }) {
  return (
    <div className="adm-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button key={tab.value} type="button" role="tab" className="adm-tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}>
          {tab.label}
          {typeof tab.count === "number" && tab.count > 0 && <span className="adm-nav-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SaveBar({ dirty, saving, onSave, onDiscard, message }: { dirty: boolean; saving?: boolean; onSave: () => void; onDiscard?: () => void; message?: string }) {
  const t = useT();
  if (!dirty) return null;
  return (
    <div className="adm-savebar">
      <div className="adm-savebar-inner" role="region" aria-label={t("Unsaved changes")}>
        <p>{message ?? t("You have unsaved changes")}</p>
        {onDiscard && <Button variant="ghost" onClick={onDiscard} disabled={saving}>{t("Discard")}</Button>}
        <Button variant="primary" onClick={onSave} loading={saving}>{t("Save changes")}</Button>
      </div>
    </div>
  );
}
