import type { ComponentType } from "react";
import { Hammer } from "lucide-react";
import { useT } from "@/admin/i18n";
import type { SectionId } from "@/admin/nav";
import { SECTIONS } from "@/admin/nav";
import { EmptyState, PageHeader } from "@/admin/ui/layout";
import { AccountSection } from "@/admin/sections/account/AccountSection";
import { HomeSection } from "@/admin/sections/home/HomeSection";
import { OrdersSection } from "@/admin/sections/orders/OrdersSection";
import { MenuSection } from "@/admin/sections/catalog/MenuSection";
import { RetailSection } from "@/admin/sections/catalog/RetailSection";
import { MessagesSection } from "@/admin/sections/messages/MessagesSection";
import { MarketingSection } from "@/admin/sections/marketing/MarketingSection";
import { CustomersSection } from "@/admin/sections/customers/CustomersSection";
import { TeamSection } from "@/admin/sections/team/TeamSection";
import { ReportsSection } from "@/admin/sections/reports/ReportsSection";
import { HealthSection } from "@/admin/sections/health/HealthSection";
import { PhotosSection } from "@/admin/sections/photos/PhotosSection";
import { InvoicesSection } from "@/admin/sections/invoices/InvoicesSection";
import { ShopSettingsSection } from "@/admin/sections/settings/ShopSettingsSection";

function ComingSoon({ id }: { id: SectionId }) {
  const t = useT();
  const label = SECTIONS.find((s) => s.id === id)?.label ?? "";
  return (
    <>
      <PageHeader title={t(label)} />
      <EmptyState icon={<Hammer size={32} />} title={t("This screen is being built")} body={t("It will appear here in the next update.")} />
    </>
  );
}

const VIEWS: Partial<Record<SectionId, ComponentType>> = {
  home: HomeSection,
  orders: OrdersSection,
  menu: MenuSection,
  retail: RetailSection,
  messages: MessagesSection,
  marketing: MarketingSection,
  customers: CustomersSection,
  team: TeamSection,
  reports: ReportsSection,
  health: HealthSection,
  photos: PhotosSection,
  invoices: InvoicesSection,
  settings: ShopSettingsSection,
  account: AccountSection,
};

export function SectionView({ section }: { section: SectionId }) {
  const View = VIEWS[section];
  return View ? <View key={section} /> : <ComingSoon id={section} />;
}
