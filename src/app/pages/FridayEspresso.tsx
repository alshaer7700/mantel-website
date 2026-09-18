import type { MenuCategory, MenuItem, Page } from "@/app/types";
import { formatBhd } from "@/app/content/retail";
import { MAPS_URL, ORDERING_OPEN } from "@/lib/constants";
import {
  EXTRACTION_SPECS,
  SERVICE_SPECS,
  TRAY_ANNOTATIONS,
  TRAY_ASPECT,
  TRAY_PHOTO,
  TRAY_PHOTO_ALT,
  type CoffeeSpec,
  type TrayAnnotation,
} from "@/app/content/ritual";
import { TrayArt } from "@/app/components/ritual/TrayArt";

/*
 * Friday Espresso — the page behind "View the details" in the home page's
 * section 01.
 *
 * The picture is the page: it sits in the middle, and the copy hangs off it on
 * thin drawn lines, the way a parts diagram labels a drawing. What sits in the
 * middle is the line drawing in components/ritual/TrayArt.tsx, or a photograph
 * once content/ritual.ts names one — this file renders whichever it is handed
 * and is otherwise indifferent. Everything else shown here comes from that same
 * content file, so the words and the picture can change without touching layout.
 *
 * TWO LAYOUTS, ONE DOM. On a wide screen the notes are absolutely positioned on
 * rails either side of the picture and an SVG draws an elbow from each note to
 * its dot. Below 1180px the rails collapse: the same notes become an ordinary
 * numbered list under the picture and the drawn lines are hidden, because a
 * narrow rail has no room for the copy and a leader line that crosses it is
 * noise rather than information. The stylesheet's own comment carries the
 * arithmetic behind that number. Nothing is drawn on the picture itself — the
 * leaders are the only marks — so below the breakpoint the notes stand on their
 * own titles, which with two of them ("The espresso", "Sparkling water") is
 * enough to tell them apart without anything to point at.
 */

/*
 * The picture's width as a percentage of the stage, on wide screens only.
 * Shared with the CSS (--ritual-photo-w) because the leader lines are drawn in
 * stage coordinates and have to know where the picture's edges are: the frame
 * runs from 27% to 73%, so a dot at x=50 in *picture* space is at
 * 27 + 50% of 46 = 50 in stage space. Change one and the other has to follow,
 * which is why the number lives here and is handed to CSS rather than written
 * out twice.
 */
const PHOTO_WIDTH_PCT = 46;
const PHOTO_LEFT_PCT = (100 - PHOTO_WIDTH_PCT) / 2;
/*
 * Where each leader line turns its corner, and how wide the rails are — both
 * in stage percentages, and both constrained by the other. The corner has to
 * fall in the gap between a rail's inner edge (20%) and the picture's outer
 * edge (27%): too close to the picture and the line fouls the frame's corner
 * tick, too close to the rail and the run out of the note collapses to nothing
 * and the leader reads as a stray vertical stroke. RAIL_WIDTH_PCT must match
 * .editorial-ritual-note's width in the stylesheet.
 */
const ELBOW_GAP_PCT = 3;
const RAIL_WIDTH_PCT = 20;
/*
 * A gap between the note and the start of its leader. Without it the line
 * begins exactly where the text ends, at the text's own vertical centre, and
 * the last line of the note reads as struck through.
 */
const LEADER_GAP_PCT = 1.5;

/** A dot's horizontal position in stage space, from its position on the photo. */
function dotStageX(annotation: TrayAnnotation): number {
  return PHOTO_LEFT_PCT + (annotation.x / 100) * PHOTO_WIDTH_PCT;
}

/*
 * The leader line: out of the note horizontally, a corner just clear of the
 * photo's edge, then in to the dot. Drawn in a 0–100 viewBox on both axes with
 * preserveAspectRatio="none", so the path follows the notes and dots however
 * the stage is proportioned; vector-effect keeps the stroke a hairline instead
 * of stretching with it.
 */
function leaderPath(annotation: TrayAnnotation): string {
  const dotX = dotStageX(annotation);
  const left = annotation.side === "left";
  const start = left
    ? RAIL_WIDTH_PCT + LEADER_GAP_PCT
    : 100 - RAIL_WIDTH_PCT - LEADER_GAP_PCT;
  const elbow = left
    ? PHOTO_LEFT_PCT - ELBOW_GAP_PCT
    : PHOTO_LEFT_PCT + PHOTO_WIDTH_PCT + ELBOW_GAP_PCT;
  return `M ${start} ${annotation.labelY} H ${elbow} V ${annotation.y} H ${dotX}`;
}

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  /** The live menu, for the two prices this page quotes. */
  menuItems: MenuItem[];
};

/*
 * The tray's two named drinks are on the menu, so their prices are read from
 * it rather than restated here — a price written into a page is a price that
 * goes stale the first time the counter changes it. A missing item, or one
 * still priced at 0 while the menu is being set, simply shows no figure.
 */
function priceOf(menuItems: MenuItem[], name: string): number | null {
  const item = menuItems.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (!item || !(item.price > 0)) return null;
  return item.price;
}

export function FridayEspresso({ linkTo, menuItems }: Props) {
  const espresso = priceOf(menuItems, "Espresso");
  const sparkling = priceOf(menuItems, "Sparkling Water");
  const publishedExtraction = EXTRACTION_SPECS.filter((spec) => spec.value !== null);

  return (
    <article className="editorial-ritual-page">
      <header className="editorial-ritual-head">
        <p className="editorial-overline">01 — A Mantel ritual</p>
        <h1>Friday Espresso.</h1>
        <p className="editorial-ritual-standfirst">
          One tray, set down the same way every Friday. An espresso, a glass of sparkling water,
          and the few minutes it takes to drink them at the counter.
        </p>
        <div className="editorial-inline-links">
          {ORDERING_OPEN && (
            <a {...linkTo("pickup")} className="editorial-link">Order before reach</a>
          )}
          <a
            className="editorial-link"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Find us
          </a>
        </div>
      </header>

      <section className="editorial-ritual-stage-wrap" aria-labelledby="ritual-tray-title">
        <h2 className="sr-only" id="ritual-tray-title">What is on the tray</h2>

        <div
          className="editorial-ritual-stage"
          style={{ "--ritual-photo-w": `${PHOTO_WIDTH_PCT}%` } as React.CSSProperties}
        >
          <figure
            className={`editorial-ritual-frame ${TRAY_PHOTO ? "" : "is-drawn"}`}
            style={{ aspectRatio: TRAY_ASPECT }}
          >
            {TRAY_PHOTO ? <img src={TRAY_PHOTO} alt={TRAY_PHOTO_ALT} /> : <TrayArt />}
          </figure>

          {/*
            * Decoration: the same relationships the notes state in text.
            *
            * Lines and nothing else. There used to be a numbered badge on each
            * object and a filled terminator where each leader met it; both are
            * gone, so the line runs to the thing it names and stops there.
            *
            * The terminator could not simply be left behind once the badge went.
            * It was an r="1" <circle> in a 0–100 viewBox drawn with
            * preserveAspectRatio="none", which is not a circle at all — the
            * viewBox stretches to the stage, so it rendered as an ellipse as
            * many times wider than tall as the stage is. A 22px badge sat on top
            * of it, which is the only reason that never showed. Anything drawn
            * in here that is meant to be round has to be a DOM element
            * positioned in percentages, the way the badges were, not SVG
            * geometry — only the strokes survive this viewBox, and only because
            * vector-effect keeps them hairlines.
            */}
          <svg
            className="editorial-ritual-wires"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {TRAY_ANNOTATIONS.map((annotation) => (
              <path
                key={annotation.n}
                d={leaderPath(annotation)}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          <ol className="editorial-ritual-notes">
            {TRAY_ANNOTATIONS.map((annotation) => (
              <li
                key={annotation.n}
                className={`editorial-ritual-note editorial-ritual-note-${annotation.side}`}
                style={{ "--ritual-note-y": `${annotation.labelY}%` } as React.CSSProperties}
              >
                <p className="editorial-ritual-note-index">{annotation.n}</p>
                <h3>{annotation.title}</h3>
                <p>{annotation.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="editorial-ritual-specs" aria-labelledby="ritual-specs-title">
        <div className="editorial-ritual-specs-intro">
          <p className="editorial-overline">02 — How it is served</p>
          <h2 id="ritual-specs-title">The same, every Friday.</h2>
          <p>
            Two drinks, one tray, and no variation worth mentioning. That is the whole of it.
          </p>
        </div>

        <dl className="editorial-ritual-spec-list">
          {SERVICE_SPECS.map((spec) => (
            <SpecRow key={spec.label} label={spec.label} value={spec.value} />
          ))}
          {/* Prices are the menu's to state, so a row appears only for a drink
              the menu currently carries a price for. */}
          {espresso !== null && <SpecRow label="Espresso" value={formatBhd(espresso)} />}
          {sparkling !== null && <SpecRow label="Sparkling water" value={formatBhd(sparkling)} />}
        </dl>
      </section>

      {/*
        * The recipe, once there is one. EXTRACTION_SPECS ships empty and this
        * whole section stays out of the document until a value is filled in —
        * a heading over seven em dashes reads as a page that broke, and a
        * plausible dose nobody weighed would be worse than either.
        */}
      {publishedExtraction.length > 0 && (
        <section className="editorial-ritual-specs" aria-labelledby="ritual-recipe-title">
          <div className="editorial-ritual-specs-intro">
            <p className="editorial-overline">03 — The coffee</p>
            <h2 id="ritual-recipe-title">How it is made.</h2>
            <p>The house recipe, weighed rather than judged by eye.</p>
          </div>

          <dl className="editorial-ritual-spec-list">
            {publishedExtraction.map((spec) => (
              <SpecRow key={spec.label} label={spec.label} value={spec.value} />
            ))}
          </dl>
        </section>
      )}

      <footer className="editorial-ritual-foot">
        <a {...linkTo("menu")} className="editorial-link">View the full menu</a>
        <a {...linkTo("home")} className="editorial-link">Back to Mantel</a>
      </footer>
    </article>
  );
}

function SpecRow({ label, value }: { label: string; value: CoffeeSpec["value"] }) {
  return (
    <div className="editorial-ritual-spec-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
