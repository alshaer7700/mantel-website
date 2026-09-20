import type { ReactNode } from "react";
import { LABEL } from "@/app/components/type";

/*
 * The site's signature device, from the design direction: every section hangs
 * off a hairline rule. Content sits ABOVE the rule; the section label and its
 * number hang BELOW it, absolutely positioned, so the rule reads as a shelf
 * with the label tucked underneath rather than as a heading underline.
 *
 * The rule draws itself in from the left on mount. That is a scaleX transform
 * on a pseudo-element in the prototype; here it is a real element, because a
 * pseudo-element cannot be given a transform origin per instance without a
 * second class.
 *
 * Motion is opt-out at the CSS level: theme.css's prefers-reduced-motion block
 * collapses every animation duration, so the rule appears drawn rather than
 * drawing. Nothing here needs to check for that.
 */

type Props = {
  /** The label that hangs below the rule, left. */
  tag: string;
  /** What hangs below the rule, right — a section number, or a note. */
  note?: string;
  children: ReactNode;
  className?: string;
};

export function Shelf({ tag, note, children, className = "" }: Props) {
  return (
    <div className={`relative pt-[44px] ${className}`}>
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 origin-left animate-[shelf-draw_1.1s_cubic-bezier(.16,.84,.44,1)_forwards]"
        style={{ height: "var(--shelf)", background: "var(--line)", transform: "scaleX(0)" }}
      />
      <span className={`${TAG} absolute left-0`} style={{ top: "calc(var(--shelf) + 9px)" }}>
        {tag}
      </span>
      {note && (
        <span className={`${TAG} absolute right-0`} style={{ top: "calc(var(--shelf) + 9px)" }}>
          {note}
        </span>
      )}
      {children}
    </div>
  );
}

/* Was a verbatim copy of LABEL, kept in step by hand and drifting the moment
   either changed. It is the same treatment, so it is the same constant. */
const TAG = LABEL;
