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
        <p className="editorial-about-placeholder">Short About Us paragraph coming soon.</p>
        <a {...linkTo("contact")} className="editorial-link">Contact Mantel</a>
      </div>
    </div>
  );
}
