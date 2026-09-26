import type { MenuCategory, Page } from "@/app/types";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

export function Story({ linkTo }: Props) {
  return (
    <div className="editorial-about-page">
      <p className="editorial-overline">About Us</p>
      <div className="editorial-about-content">
        <h1>About Us.</h1>
        <p className="editorial-about-placeholder">
          For mornings that take their time, afternoons that turn into evenings, and the
          everyday moments worth keeping. Good things, made simply and shared often.
        </p>

        <dl className="editorial-about-hours" aria-label="Opening hours">
          <div className="editorial-about-hours-row">
            <dt>Weekday</dt>
            <dd>7am – 10pm</dd>
          </div>
          <div className="editorial-about-hours-row">
            <dt>Weekend</dt>
            <dd>8am – 12am</dd>
          </div>
        </dl>

        <a {...linkTo("contact")} className="editorial-link">Contact Mantel</a>
      </div>
    </div>
  );
}
