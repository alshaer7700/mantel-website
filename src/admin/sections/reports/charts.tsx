import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Small, dependency-free charts for Reports.
 *
 * One series each, drawn in the ink token so they follow light and dark mode.
 * Magnitude in the heatmap is one hue, light to dark. Every mark has a hover
 * readout, and every chart has a table or list beside it for exact numbers.
 */

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** A bar's path with the data end rounded and the baseline end square. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return "";
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export type BarDatum = { key: string; label: string; value: number; tip: ReactNode };

export function BarChart({ data, format, height = 220, ariaLabel }: { data: BarDatum[]; format: (v: number) => string; height?: number; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const left = 56;
  const bottom = 24;
  const top = 8;
  const plotW = Math.max(0, width - left - 4);
  const plotH = height - bottom - top;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const slot = data.length ? plotW / data.length : 0;
  const gap = Math.min(2, slot * 0.2) + (slot > 24 ? slot * 0.25 : 0);
  const barW = Math.max(1, slot - gap);
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 64))));
  const h = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {width > 0 && (
        <svg className="adm-chart" width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
          {ticks.map((tick) => {
            const y = top + plotH - (tick / max) * plotH;
            return (
              <g key={tick}>
                <line className="grid" x1={left} x2={width} y1={y} y2={y} />
                <text x={left - 8} y={y + 4} textAnchor="end">{format(tick)}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const bh = (d.value / max) * plotH;
            const x = left + i * slot + gap / 2;
            return (
              <g key={d.key}>
                <path className="bar" d={barPath(x, top + plotH - bh, barW, bh)} opacity={hover === null || hover === i ? 1 : 0.45} />
                {(i % every === 0 || i === data.length - 1) && (
                  <text x={x + barW / 2} y={height - 6} textAnchor="middle">{d.label}</text>
                )}
                <rect
                  x={left + i * slot}
                  y={top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                />
              </g>
            );
          })}
          <line x1={left} x2={width} y1={top + plotH} y2={top + plotH} stroke="var(--a-line-strong)" />
        </svg>
      )}
      {h && hover !== null && (
        <div
          className="adm-chart-tip"
          style={{ left: Math.min(Math.max(0, left + hover * slot + slot / 2 - 80), Math.max(0, width - 160)), top: 0 }}
        >
          {h.tip}
        </div>
      )}
    </div>
  );
}

export type HeatCell = { dow: number; hour: number; orders: number };

/** Weekday × hour of day. Darker = more orders. */
export function Heatmap({ cells, dayLabel, emptyLabel, tip }: { cells: HeatCell[]; dayLabel: (dow: number) => string; emptyLabel: string; tip: (c: HeatCell) => string }) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  const hours = cells.map((c) => c.hour);
  const from = Math.min(7, ...hours);
  const to = Math.max(22, ...hours);
  const span = to - from + 1;
  const max = Math.max(1, ...cells.map((c) => c.orders));
  const at = (dow: number, hour: number) => cells.find((c) => c.dow === dow && c.hour === hour)?.orders ?? 0;
  // Saturday first: the Bahraini week.
  const days = [6, 0, 1, 2, 3, 4, 5];
  const columns = `72px repeat(${span}, minmax(18px, 1fr))`;

  return (
    <div className="adm-stack" style={{ gap: 8 }}>
      <div className="adm-heat" role="table" aria-label={emptyLabel}>
        <div className="adm-heat-row" style={{ gridTemplateColumns: columns }} role="row">
          <span />
          {Array.from({ length: span }, (_, i) => from + i).map((hour) => (
            <span key={hour} className="adm-heat-hour" role="columnheader">{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span>
          ))}
        </div>
        {days.map((dow) => (
          <div key={dow} className="adm-heat-row" style={{ gridTemplateColumns: columns }} role="row">
            <span className="adm-heat-day" role="rowheader">{dayLabel(dow)}</span>
            {Array.from({ length: span }, (_, i) => from + i).map((hour) => {
              const n = at(dow, hour);
              const cell = { dow, hour, orders: n };
              return (
                <span
                  key={hour}
                  role="cell"
                  tabIndex={n ? 0 : -1}
                  className={`adm-heat-cell ${n ? "" : "is-empty"}`}
                  style={n ? { opacity: 0.15 + 0.85 * (n / max) } : undefined}
                  aria-label={tip(cell)}
                  title={tip(cell)}
                  onMouseEnter={() => setHover(cell)}
                  onFocus={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="adm-small adm-muted" aria-live="polite" style={{ minHeight: "1.5em" }}>{hover ? tip(hover) : " "}</p>
    </div>
  );
}

/** A ranked list with a thin bar under each row — easier to read than a pie. */
export function BarList({ rows, format }: { rows: { key: string; label: ReactNode; value: number; note?: ReactNode }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="adm-bar-list">
      {rows.map((r) => (
        <div key={r.key} className="adm-bar-row">
          <span className="adm-truncate">{r.label}</span>
          <span className="adm-small adm-num">{format(r.value)}{r.note ? <span className="adm-muted"> · {r.note}</span> : null}</span>
          <div className="adm-bar-track"><div className="adm-bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
