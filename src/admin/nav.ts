import {
  BarChart3,
  Coffee,
  Globe,
  HeartPulse,
  Home,
  Images,
  Inbox,
  CreditCard,
  FileText,
  Megaphone,
  Receipt,
  Settings,
  ShoppingBag,
  UserCircle,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type Area =
  | "orders"
  | "catalog"
  | "content"
  | "settings"
  | "customers"
  | "messages"
  | "marketing"
  | "reports"
  | "staff"
  | "system"
  | "payments";

export type SectionId =
  | "home"
  | "orders"
  | "invoices"
  | "menu"
  | "retail"
  | "website"
  | "photos"
  | "customers"
  | "messages"
  | "marketing"
  | "reports"
  | "settings"
  | "team"
  | "health"
  | "payments"
  | "account";

export type NavSection = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  /** Which permission opens it; null = every staff member. */
  area: Area | null;
  group: string | null;
  /** Words a manager might type into search to find this screen. */
  keywords: string;
};

export const SECTIONS: NavSection[] = [
  { id: "home", label: "Today", icon: Home, area: null, group: null, keywords: "home overview dashboard today summary" },
  { id: "orders", label: "Orders", icon: Receipt, area: "orders", group: "Run the café", keywords: "orders board queue pickup tickets print refund cancel" },
  { id: "invoices", label: "Invoices & letterhead", icon: FileText, area: "payments", group: "Run the café", keywords: "invoice invoices bill receipt vat tax letterhead template word logo cr address footer" },
  { id: "menu", label: "Menu", icon: Coffee, area: "catalog", group: "Run the café", keywords: "menu items drinks food prices categories options sold out allergens" },
  { id: "retail", label: "Retail shop", icon: ShoppingBag, area: "catalog", group: "Run the café", keywords: "retail products objects shop stock candles totes" },
  { id: "website", label: "Website pages", icon: Globe, area: "content", group: "Website", keywords: "website pages faq privacy terms refund about home friday espresso seo google share" },
  { id: "photos", label: "Photo library", icon: Images, area: "content", group: "Website", keywords: "photos images library upload" },
  { id: "customers", label: "Customers", icon: Users, area: "customers", group: "People", keywords: "customers people regulars vip block privacy export delete" },
  { id: "messages", label: "Messages", icon: Inbox, area: "messages", group: "People", keywords: "messages contact inbox reply email notifications" },
  { id: "marketing", label: "Marketing", icon: Megaphone, area: "marketing", group: "Grow", keywords: "newsletter campaigns promo codes discounts loyalty gift cards referral featured" },
  { id: "reports", label: "Reports", icon: BarChart3, area: "reports", group: "Grow", keywords: "reports sales revenue best sellers busiest hours export accountant visits" },
  { id: "settings", label: "Shop settings", icon: Settings, area: "settings", group: "Setup", keywords: "settings hours opening closures holidays pause ordering pickup announcement popup vat tax contact maintenance" },
  { id: "payments", label: "Payments", icon: CreditCard, area: "payments", group: "Setup", keywords: "payments card benefitpay tap refunds payouts cash" },
  { id: "team", label: "Team", icon: UsersRound, area: "staff", group: "Setup", keywords: "team staff invite roles permissions activity log security two-step" },
  { id: "health", label: "Site health", icon: HeartPulse, area: "system", group: "Setup", keywords: "health errors backup export email delivery suspicious maintenance" },
  { id: "account", label: "My account", icon: UserCircle, area: null, group: null, keywords: "account language arabic english theme dark password pin" },
];

export function sectionFromPath(pathname: string): { section: SectionId; rest: string[] } {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const tail = parts[0] === "admin" ? parts.slice(1) : parts;
  const id = (tail[0] ?? "home") as SectionId;
  const known = SECTIONS.some((s) => s.id === id);
  return { section: known ? id : "home", rest: known ? tail.slice(1) : [] };
}

export function adminPath(section: SectionId, ...rest: (string | null | undefined)[]): string {
  const tail = rest.filter(Boolean).join("/");
  if (section === "home" && !tail) return "/admin";
  return `/admin/${section}${tail ? `/${tail}` : ""}`;
}
