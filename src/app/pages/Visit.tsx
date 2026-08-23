import { LABEL, LABEL_INK } from "@/app/components/type";

/*
 * Where the shop is, when it is open, and how to reach it. Four lines.
 *
 * This page did not exist. It is in the design direction as "04 · VISIT" and
 * in the prototype, where it carried opening hours, a map note and a Pickup
 * paragraph reading "Order ahead and collect at the counter. Most orders are
 * ready in 15 minutes." The pickup sentence is not here: the home page's
 * eyebrow already says "Order ahead", and a second, longer promise about a
 * service that has not opened yet is the one thing this page should not add.
 *
 * The locality is written "Al Hidd, Muharraq, Bahrain" here and "Al Hidd,
 * Bahrain" on the home eyebrow. That is deliberate — the eyebrow is a byline
 * and this is an address — and it is the only page where the governorate
 * appears. The footer keeps its own longer form.
 *
 * The address is not a link to a map. There is no verified pin for the shop,
 * and a maps link that lands on the wrong side of Muharraq is worse than a
 * line of type someone can read out to a taxi driver.
 */

const HOURS: ReadonlyArray<[string, string]> = [
  ["Sat–Wed", "07:00–23:00"],
  ["Thu–Fri", "07:00–01:00"],
];

export function Visit() {
  return (
    <div className="pt-[clamp(3rem,9vh,6rem)] pb-[clamp(3rem,9vh,6rem)]">
      <h1 className="sr-only">Visit</h1>

      <div className="flex flex-col gap-[var(--s-4)] max-w-[42ch]">
        <p className="font-serif text-[clamp(1.4rem,3.4vw,2rem)] leading-[1.25] m-0 text-[color:var(--ink)]">
          Al Hidd, Muharraq, Bahrain
        </p>

        <dl className="m-0">
          {HOURS.map(([days, hours]) => (
            <div
              key={days}
              className="flex justify-between gap-[var(--s-3)] py-[0.55rem] border-b border-[color:var(--line-soft)]"
            >
              <dt className={LABEL}>{days}</dt>
              {/* tabular-nums so the two ranges line up digit under digit. */}
              <dd className={`${LABEL} m-0 tabular-nums`}>{hours}</dd>
            </div>
          ))}
        </dl>

        <a href="mailto:hello@bymantel.com" className={`${LABEL_INK} w-fit`}>
          hello@bymantel.com
        </a>
      </div>
    </div>
  );
}
