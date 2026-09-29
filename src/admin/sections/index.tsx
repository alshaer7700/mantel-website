import type { ComponentType } from "react";
import { Hammer } from "lucide-react";
import { useT } from "@/admin/i18n";
import type { SectionId } from "@/admin/nav";
import { SECTIONS } from "@/admin/nav";
import { EmptyState, PageHeader } from "@/admin/ui/layout";
import { AccountSection } from "@/admin/sections/account/AccountSection";

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
  account: AccountSection,
};

export function SectionView({ section }: { section: SectionId }) {
  const View = VIEWS[section];
  return View ? <View key={section} /> : <ComingSoon id={section} />;
}
