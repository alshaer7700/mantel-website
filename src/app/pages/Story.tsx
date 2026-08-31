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
        <p className="editorial-about-placeholder">Mantel is a small place in Hidd for good espresso and the small rituals around it. We keep the counter warm, the menu considered, and the pace a little slower — whether you are passing through or staying for another cup.</p>
        <a {...linkTo("contact")} className="editorial-link">Contact Mantel</a>
      </div>
    </div>
  );
}
