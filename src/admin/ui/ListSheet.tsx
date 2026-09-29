import type { ExportSpec, Letterhead } from "@/admin/lib/letterhead";
import { LetterheadSheet } from "@/admin/ui/LetterheadSheet";

/*
 * A list (orders, customers, sales…) laid out on the letterhead for the PDF
 * download: the same title, tables and "Downloaded …" line as the Word file,
 * drawn with the same sheet the invoices use. Always in English, like every
 * document that leaves the café.
 */
export function ListSheet({ head, spec }: { head: Letterhead; spec: ExportSpec }) {
  const small = spec.sections.some((s) => s.columns.filter((c) => !c.wordless).length > 5);
  return (
    <LetterheadSheet head={head}>
      <div style={{ marginTop: "8mm", fontSize: "15pt", fontWeight: 700 }}>{spec.title}</div>
      {spec.subtitle && <p style={{ margin: "1mm 0 0", color: "#766E66" }}>{spec.subtitle}</p>}
      {spec.sections.map((section, i) => {
        const cols = section.columns.filter((c) => !c.wordless);
        const total = cols.reduce((sum, c) => sum + (c.weight ?? 1), 0);
        return (
          <div key={i} style={{ marginTop: "7mm" }}>
            {section.heading && <h2 style={{ margin: "0 0 3mm", fontSize: "11.5pt", fontWeight: 700 }}>{section.heading}</h2>}
            {section.rows.length === 0 ? (
              <p style={{ margin: 0, color: "#766E66" }}>Nothing to show.</p>
            ) : (
              <table className="mtl-table" style={{ tableLayout: "fixed", fontSize: small ? "8.5pt" : "9.5pt" }}>
                <colgroup>
                  {cols.map((c) => <col key={c.key} style={{ width: `${((c.weight ?? 1) / total) * 100}%` }} />)}
                </colgroup>
                <thead>
                  <tr>
                    {cols.map((c, k) => <th key={c.key} className={c.align === "right" ? "num" : undefined} style={{ paddingRight: k === cols.length - 1 ? 0 : "4mm" }}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((r, j) => (
                    <tr key={j}>
                      {cols.map((c, k) => (
                        <td
                          key={c.key}
                          className={c.align === "right" ? "num" : undefined}
                          style={{ whiteSpace: c.align === "right" ? "nowrap" : "pre-line", overflowWrap: "anywhere", fontSize: c.align === "right" ? "inherit" : undefined, paddingRight: k === cols.length - 1 ? 0 : "4mm" }}
                        >
                          {r[c.key] === null || r[c.key] === undefined ? "" : String(r[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
      <p style={{ margin: "8mm 0 0", color: "#766E66", fontSize: "9pt" }}>
        Downloaded {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bahrain", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())}
      </p>
    </LetterheadSheet>
  );
}
