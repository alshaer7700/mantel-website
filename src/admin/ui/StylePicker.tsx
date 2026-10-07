import { useState } from "react";
import { RotateCcw, Type } from "lucide-react";
import { useT } from "@/admin/i18n";
import { Button, SelectField } from "@/admin/ui/controls";
import { TEXT_FONTS, textStyleCss, type TextFont, type TextStyle } from "@/lib/content/pages";

/* ── Font and size ───────────────────────────────────────────────────────── */

const SIZES = [60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 250];

/**
 * A box's font and size, folded away under one small button so the page of
 * boxes stays calm. Size is a percentage of what the website's design gives
 * that text: 100% leaves it as designed.
 */
export function StylePicker({ label, value, sample, onChange }: { label?: string; value: TextStyle | undefined; sample: string; onChange: (s: TextStyle | undefined) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const set = !!value && (!!value.font || !!value.size);
  const summary = set
    ? [value?.font ? t(TEXT_FONTS[value.font].label) : null, value?.size ? `${value.size}%` : null].filter(Boolean).join(" · ")
    : t("Website's own font and size");
  const css = textStyleCss(value);
  return (
    <div className="adm-style-picker">
      <button type="button" className="adm-style-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Type size={14} aria-hidden="true" />
        <span>{label ? `${label}: ` : ""}{t("Font and size")}</span>
        <span className={set ? "adm-style-summary is-set" : "adm-style-summary"}>{summary}</span>
      </button>
      {open && (
        <div className="adm-style-panel">
          <div className="adm-form-grid">
            <SelectField
              label={t("Font")}
              value={value?.font ?? ""}
              onChange={(v) => onChange({ ...value, font: (v || undefined) as TextFont | undefined })}
              options={[
                { value: "", label: t("Website's own font") },
                ...(Object.keys(TEXT_FONTS) as TextFont[]).map((k) => ({ value: k, label: t(TEXT_FONTS[k].label) })),
              ]}
            />
            <SelectField
              label={t("Size")}
              value={String(value?.size ?? 100)}
              onChange={(v) => onChange({ ...value, size: Number(v) === 100 ? undefined : Number(v) })}
              options={SIZES.map((n) => ({ value: String(n), label: n === 100 ? t("100% (as designed)") : `${n}%` }))}
            />
          </div>
          <p className="adm-style-preview" dir="auto">
            <span style={{ ...css, fontSize: `${((value?.size ?? 100) / 100) * 18}px` }}>{sample.trim().slice(0, 120) || t("How the text will look")}</span>
          </p>
          {set && <div><Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => onChange(undefined)}>{t("Back to the website's own font and size")}</Button></div>}
        </div>
      )}
    </div>
  );
}
