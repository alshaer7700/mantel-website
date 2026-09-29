import type { MenuCategory, Page } from "@/app/types";
import type { PAGE_DEFAULTS } from "@/lib/content/pages";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  content: (typeof PAGE_DEFAULTS)["about"];
  /** From Shop settings' opening hours; the shipped hours until those load. */
  hours: { days: string; hours: string }[];
};

const FALLBACK_HOURS = [
  { days: "Weekday", hours: "7am – 10pm" },
  { days: "Weekend", hours: "8am – 12am" },
];

export function Story({ linkTo, content, hours }: Props) {
  const rows = hours.length ? hours : FALLBACK_HOURS;
  return (
    <div className="editorial-about-page">
      <p className="editorial-overline">About Us</p>
      <div className="editorial-about-content">
        <h1>{content.title}</h1>
        <p className="editorial-about-placeholder" style={{ whiteSpace: "pre-line" }}>{content.text}</p>

        <dl className="editorial-about-hours" aria-label="Opening hours">
          {rows.map((row) => (
            <div key={row.days} className="editorial-about-hours-row">
              <dt>{row.days}</dt>
              <dd>{row.hours}</dd>
            </div>
          ))}
        </dl>

        <a {...linkTo("contact")} className="editorial-link">{content.link}</a>
      </div>
    </div>
  );
}
