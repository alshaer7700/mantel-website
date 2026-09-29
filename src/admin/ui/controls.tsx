import { forwardRef, useId, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { useT } from "@/admin/i18n";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
};

export function Button({ variant = "secondary", size = "md", loading, icon, block, children, className = "", disabled, type = "button", ...rest }: ButtonProps) {
  const cls = [
    "adm-btn",
    variant === "primary" && "adm-btn-primary",
    variant === "danger" && "adm-btn-danger",
    variant === "ghost" && "adm-btn-ghost",
    size === "sm" && "adm-btn-sm",
    size === "lg" && "adm-btn-lg",
    block && "adm-btn-block",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 size={16} className="adm-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={`adm-icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  help?: ReactNode;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
};

export function Field({ label, hint, error, optional, help, className = "", children }: FieldProps) {
  const t = useT();
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`adm-field ${className}`}>
      <label className="adm-label" htmlFor={id}>
        {label}
        {optional && <span className="adm-label-opt">({t("optional")})</span>}
        {help && <HelpTip>{help}</HelpTip>}
      </label>
      {children(id, describedBy)}
      {hint && <p className="adm-hint" id={hintId}>{hint}</p>}
      {error && <p className="adm-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  help?: ReactNode;
  prefix?: string;
  fieldClassName?: string;
};

export function TextField({ label, value, onChange, hint, error, optional, help, prefix, fieldClassName, ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} help={help} className={fieldClassName}>
      {(id, describedBy) => {
        const input = (
          <input
            id={id}
            className="adm-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
        );
        return prefix ? <div className="adm-input-affix"><span>{prefix}</span>{input}</div> : input;
      }}
    </Field>
  );
}

type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  help?: ReactNode;
  fieldClassName?: string;
};

export function TextArea({ label, value, onChange, hint, error, optional, help, fieldClassName, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} help={help} className={fieldClassName}>
      {(id, describedBy) => (
        <textarea
          id={id}
          className="adm-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      )}
    </Field>
  );
}

type NumberFieldProps = {
  label: ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  help?: ReactNode;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  placeholder?: string;
  fieldClassName?: string;
  disabled?: boolean;
};

/** Keeps the typed text while editing so "1." and "" don't jump around. */
export function NumberField({ label, value, onChange, hint, error, optional, help, prefix, step, min, max, decimals, placeholder, fieldClassName, disabled }: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null || value === undefined ? "" : decimals !== undefined ? value.toFixed(decimals) : String(value));
  return (
    <Field label={label} hint={hint} error={error} optional={optional} help={help} className={fieldClassName}>
      {(id, describedBy) => {
        const input = (
          <input
            id={id}
            className="adm-input adm-num"
            inputMode={decimals ? "decimal" : "numeric"}
            value={shown}
            placeholder={placeholder}
            step={step}
            min={min}
            max={max}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value.replace(",", ".");
              setText(raw);
              if (raw.trim() === "") onChange(null);
              else {
                const n = Number(raw);
                if (Number.isFinite(n)) onChange(n);
              }
            }}
            onBlur={() => setText(null)}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
        );
        return prefix ? <div className="adm-input-affix"><span>{prefix}</span>{input}</div> : input;
      }}
    </Field>
  );
}

export function MoneyField(props: Omit<NumberFieldProps, "prefix" | "decimals" | "step">) {
  return <NumberField {...props} prefix="BD" decimals={3} step={0.05} />;
}

type SelectFieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: ReactNode;
  help?: ReactNode;
  optional?: boolean;
  fieldClassName?: string;
  disabled?: boolean;
};

export function SelectField({ label, value, onChange, options, hint, help, optional, fieldClassName, disabled }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} help={help} optional={optional} className={fieldClassName}>
      {(id, describedBy) => (
        <select id={id} className="adm-select" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} disabled={disabled}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

type ToggleProps = {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="adm-toggle">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="adm-switch" aria-hidden="true" />
      <span className="adm-toggle-text">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
    </label>
  );
}

export function Checkbox({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="adm-check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="adm-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="adm-chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {typeof o.count === "number" && <span className="adm-chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function MultiChips({ value, onChange, options, label }: { value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <div className="adm-chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" className="adm-chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="adm-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export const SearchInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder: string; label?: string }>(
  function SearchInput({ value, onChange, placeholder, label }, ref) {
    const t = useT();
    return (
      <div className="adm-input-affix" style={{ maxWidth: 420, flex: "1 1 240px" }}>
        <input
          ref={ref}
          type="search"
          className="adm-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
        />
        {value && (
          <button type="button" className="adm-icon-btn" onClick={() => onChange("")} aria-label={t("Clear search")} style={{ width: 40, height: "auto" }}>
            <X size={16} />
          </button>
        )}
      </div>
    );
  },
);

/** A list of short strings — email addresses, tags — edited as chips. */
export function TagInput({ label, value, onChange, placeholder, hint, validate }: { label: ReactNode; value: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: ReactNode; validate?: (v: string) => string | null }) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    const problem = validate?.(v);
    if (problem) {
      setError(problem);
      return;
    }
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
    setError("");
  };
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <div className="adm-stack" style={{ gap: 8 }}>
          {value.length > 0 && (
            <div className="adm-chips">
              {value.map((v) => (
                <span key={v} className="adm-chip" style={{ cursor: "default" }}>
                  {v}
                  <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={t("Remove {v}", { v })} style={{ border: 0, background: "none", cursor: "pointer", padding: 0, display: "grid", color: "inherit" }}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="adm-row" style={{ flexWrap: "nowrap" }}>
            <input
              id={id}
              className="adm-input"
              value={draft}
              placeholder={placeholder}
              aria-describedby={describedBy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button onClick={add}>{t("Add")}</Button>
          </div>
        </div>
      )}
    </Field>
  );
}

export function HelpTip({ children }: { children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <span className="adm-help" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="adm-help-btn"
        aria-label={t("What does this mean?")}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && <span className="adm-help-pop" role="tooltip">{children}</span>}
    </span>
  );
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
