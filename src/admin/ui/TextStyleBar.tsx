import { useId } from "react";
import { Bold, CaseUpper, Italic, RotateCcw, Underline } from "lucide-react";
import { useT } from "@/admin/i18n";
import { FONTS, type FontKey, type TextStyle } from "@/admin/lib/letterhead";

const SIZES = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 54, 60, 72];

const SPACING: { value: number; label: string }[] = [
  { value: -5, label: "Tighter" },
  { value: -3, label: "Tight" },
  { value: 0, label: "Normal" },
  { value: 4, label: "Loose" },
  { value: 8, label: "Wide" },
  { value: 15, label: "Wider" },
  { value: 25, label: "Widest" },
];

/*
 * A small formatting toolbar in the spirit of Word's: font, size, bold,
 * italic, underline, capitals, letter spacing and colour. Each control shows
 * the text it changes in the preview straight away.
 */
export function TextStyleBar({ label, value, onChange, fallback }: { label: string; value: TextStyle; onChange: (v: TextStyle) => void; fallback: TextStyle }) {
  const t = useT();
  const id = useId();
  const set = (patch: Partial<TextStyle>) => onChange({ ...value, ...patch });
  const sizes = SIZES.includes(value.size) ? SIZES : [...SIZES, value.size].sort((a, b) => a - b);
  const spacing = SPACING.some((s) => s.value === value.spacing) ? SPACING : [...SPACING, { value: value.spacing, label: String(value.spacing) }].sort((a, b) => a.value - b.value);
  const changed = JSON.stringify(value) !== JSON.stringify(fallback);

  const toggle = (key: "bold" | "italic" | "underline" | "caps", name: string, icon: React.ReactNode) => (
    <button type="button" className="adm-fmt-btn" aria-pressed={value[key]} title={name} aria-label={name} onClick={() => set({ [key]: !value[key] })}>
      {icon}
    </button>
  );

  return (
    <div className="adm-fmtbar" role="toolbar" aria-label={t("Formatting for {part}", { part: label })}>
      <label className="sr-only" htmlFor={`${id}-font`}>{t("Font")}</label>
      <select id={`${id}-font`} className="adm-fmt-select adm-fmt-font" value={value.font} onChange={(e) => set({ font: e.target.value as FontKey })} title={t("Font")}>
        {(Object.keys(FONTS) as FontKey[]).map((k) => (
          <option key={k} value={k} style={{ fontFamily: FONTS[k].css }}>{FONTS[k].label}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`${id}-size`}>{t("Size")}</label>
      <select id={`${id}-size`} className="adm-fmt-select adm-fmt-size" value={String(value.size)} onChange={(e) => set({ size: Number(e.target.value) })} title={t("Size")}>
        {sizes.map((s) => <option key={s} value={String(s)}>{s}</option>)}
      </select>
      <span className="adm-fmt-sep" aria-hidden="true" />
      {toggle("bold", t("Bold"), <Bold size={15} />)}
      {toggle("italic", t("Italic"), <Italic size={15} />)}
      {toggle("underline", t("Underline"), <Underline size={15} />)}
      {toggle("caps", t("All capitals"), <CaseUpper size={17} />)}
      <span className="adm-fmt-sep" aria-hidden="true" />
      <label className="sr-only" htmlFor={`${id}-spacing`}>{t("Letter spacing")}</label>
      <select id={`${id}-spacing`} className="adm-fmt-select" value={String(value.spacing)} onChange={(e) => set({ spacing: Number(e.target.value) })} title={t("Letter spacing")}>
        {spacing.map((s) => <option key={s.value} value={String(s.value)}>{t(s.label)}</option>)}
      </select>
      <label className="adm-fmt-color" title={t("Colour")}>
        <span className="sr-only">{t("Colour")}</span>
        <input type="color" value={value.color} onChange={(e) => set({ color: e.target.value })} />
        <span className="adm-fmt-swatch" style={{ background: value.color }} aria-hidden="true" />
      </label>
      {changed && (
        <button type="button" className="adm-fmt-btn" title={t("Back to the original look")} aria-label={t("Back to the original look")} onClick={() => onChange(fallback)}>
          <RotateCcw size={15} />
        </button>
      )}
    </div>
  );
}
