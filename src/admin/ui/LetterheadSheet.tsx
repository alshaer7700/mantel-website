import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { crLine, instagramHandle, type Letterhead } from "@/admin/lib/letterhead";

/*
 * One A4 page in the café letterhead: MANTEL. with the CR number and address,
 * the logo on the right, a rule, the content, and the labelled email and
 * Instagram at the foot. Plain CSS in millimetres (the .mtl-sheet rules in
 * admin.css) so the screen preview and the printed page are the same page.
 */
export function LetterheadSheet({ head, extraLine, children, watermark }: { head: Letterhead; extraLine?: string; children?: ReactNode; watermark?: string }) {
  const handle = instagramHandle(head.instagram);
  return (
    <div className="mtl-sheet" dir="ltr">
      {watermark && <div className="mtl-watermark" aria-hidden="true">{watermark}</div>}
      <header className="mtl-head">
        <div>
          <div className="mtl-name">{head.name || " "}</div>
          {crLine(head) && <div className="mtl-small" style={{ marginTop: "4.5mm" }}>{crLine(head)}</div>}
          {extraLine && <div className="mtl-small" style={{ marginTop: "1.5mm" }}>{extraLine}</div>}
          {head.address && <div className="mtl-small" style={{ marginTop: "2mm" }}>{head.address}</div>}
        </div>
        {head.logo_url && <img className="mtl-logo" src={head.logo_url} alt="" />}
      </header>
      <div className="mtl-rule" />
      <main className="mtl-body">{children}</main>
      {(head.email || handle) && (
        <footer className="mtl-foot">
          <div>
            {head.email && (
              <>
                <div className="mtl-label">EMAIL</div>
                <div className="mtl-foot-value">{head.email}</div>
              </>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            {handle && (
              <>
                <div className="mtl-label">INSTAGRAM</div>
                <div className="mtl-foot-value">@{handle}</div>
              </>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

/** Shows an A4 sheet shrunk to fit the space it's given. */
export function ScaledSheet({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / inner.current.offsetWidth);
      setScale(s);
      setHeight(inner.current.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="mtl-scaled" style={{ height: height || undefined }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "210mm" }}>{children}</div>
    </div>
  );
}

/** Renders the sheet on its own for the browser's print dialog, then removes it. */
export function PrintSheet({ children }: { children: ReactNode }) {
  return createPortal(<div className="adm-print-area mtl-print">{children}</div>, document.body);
}
