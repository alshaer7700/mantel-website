/*
 * The band above the nav.
 *
 * Every store this direction borrows from runs one, and every one of them
 * carries a shipping offer. Mantel doesn't ship — so it carries the two things
 * someone actually arrives wanting to know: whether the counter is open, and
 * where it is.
 *
 * The text is duplicated and the pair scrolls half its own width, which is what
 * makes the loop seamless: by the time the first copy has left, the second is
 * exactly where it started. The duplicate is decoration, so only the first is
 * announced.
 */

const LINE = [
  "Open daily · 7:00 — 23:00",
  "Hidd, Kingdom of Bahrain",
  "Pickup at the counter",
  "Small editions, in store",
];

export function Ticker() {
  return (
    <div className="editorial-ticker">
      <div className="editorial-ticker-rail">
        <Run />
        <Run aria-hidden="true" />
      </div>
    </div>
  );
}

function Run(props: { "aria-hidden"?: "true" }) {
  return (
    <div className="editorial-ticker-run" {...props}>
      {LINE.map((phrase) => (
        <span key={phrase}>
          {phrase}
          <i aria-hidden="true">·</i>
        </span>
      ))}
    </div>
  );
}
