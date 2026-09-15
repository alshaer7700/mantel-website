import type { MenuCategory, MenuItem, Page } from "@/app/types";
import { formatBhd } from "@/app/content/retail";
import { MAPS_URL, ORDERING_OPEN } from "@/lib/constants";
import {
  COFFEE_SPECS,
  TRAY_ANNOTATIONS,
  TRAY_ASPECT,
  TRAY_PHOTO,
  TRAY_PHOTO_ALT,
  type TrayAnnotation,
} from "@/app/content/ritual";

/*
 * Friday Espresso — the page behind "View the details" in the home page's
 * section 01.
 *
 * The photograph is the page: it sits in the middle, and the copy hangs off it
 * on thin drawn lines, the way a parts diagram labels a drawing. Everything
 * shown here comes from content/ritual.ts, so the words and the photo can
 * change without touching this file.
 *
 * TWO LAYOUTS, ONE DOM. On a wide screen the notes are absolutely positioned
 * on rails either side of the photo and an SVG draws an elbow from each note
 * to its dot. Below 900px the rails collapse: the same notes become an ordinary
 * numbered list under the photo and the drawn lines are hidden, because a
 * 360px-wide screen has no room for a rail and a leader line that crosses it
 * is noise rather than information. The dots stay on the photo either way, so
 * the numbers in the list still have something to point at.
 */

/*
 * The photo's width as a percentage of the stage, on wide screens only. Shared
 * with the CSS (--ritual-photo-w) because the leader lines are drawn in stage
 * coordinates and have to know where the photo's edges are: a dot at x=50 in
 * *photo* space is at 30 + 50% of 40 = 50 in stage space. Change one and the
 * other has to follow, which is why the number lives here and is handed to CSS
 * rather than written out twice.
 */
const PHOTO_WIDTH_PCT = 40;
const PHOTO_LEFT_PCT = (100 - PHOTO_WIDTH_PCT) / 2;
/*
 * Where each leader line turns its corner, and how wide the rails are — both
 * in stage percentages, and both constrained by the other. The corner has to
 * fall in the gap between a rail's inner edge (22%) and the photo's outer edge
 * (30%): too close to the photo and the line fouls the frame's corner tick,
 * too close to the rail and the run out of the note collapses to nothing and
 * the leader reads as a stray vertical stroke. RAIL_WIDTH_PCT must match
 * .editorial-ritual-note's width in the stylesheet.
 */
const ELBOW_GAP_PCT = 4;
const RAIL_WIDTH_PCT = 22;

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
  const start = left ? RAIL_WIDTH_PCT : 100 - RAIL_WIDTH_PCT;
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
          <figure className="editorial-ritual-frame" style={{ aspectRatio: TRAY_ASPECT }}>
            <img src={TRAY_PHOTO} alt={TRAY_PHOTO_ALT} />
            {TRAY_ANNOTATIONS.map((annotation) => (
              <span
                key={annotation.n}
                className="editorial-ritual-dot"
                style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                aria-hidden="true"
              >
                {annotation.n}
              </span>
            ))}
          </figure>

          {/* Decoration: the same relationships the numbered list states in text. */}
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
            {TRAY_ANNOTATIONS.map((annotation) => (
              <circle
                key={`${annotation.n}-end`}
                cx={dotStageX(annotation)}
                cy={annotation.y}
                r="1"
                fill="currentColor"
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
          <p className="editorial-overline">02 — The coffee</p>
          <h2 id="ritual-specs-title">How it is made.</h2>
          <p>
            The same recipe every Friday, weighed rather than judged by eye. Anything not listed
            below has not been set down yet.
          </p>
        </div>

        <dl className="editorial-ritual-spec-list">
          {COFFEE_SPECS.map((spec) => (
            <div className="editorial-ritual-spec-row" key={spec.label}>
              <dt>{spec.label}</dt>
              {/* An em dash, never a zero: no figure published is not a figure of nought. */}
              <dd>{spec.value ?? "—"}</dd>
            </div>
          ))}
          <div className="editorial-ritual-spec-row">
            <dt>Espresso</dt>
            <dd>{espresso === null ? "—" : formatBhd(espresso)}</dd>
          </div>
          <div className="editorial-ritual-spec-row">
            <dt>Sparkling water</dt>
            <dd>{sparkling === null ? "—" : formatBhd(sparkling)}</dd>
          </div>
        </dl>
      </section>

      <footer className="editorial-ritual-foot">
        <a {...linkTo("menu")} className="editorial-link">View the full menu</a>
        <a {...linkTo("home")} className="editorial-link">Back to Mantel</a>
      </footer>
    </article>
  );
}
