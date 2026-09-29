import { createContext, useContext } from "react";
import type { Area, SectionId } from "@/admin/nav";

export type Me = {
  user_id: string;
  email: string;
  role: "admin" | "manager" | "support";
  display_name: string;
  language: "en" | "ar";
  has_pin: boolean;
  permissions: Record<Area, boolean>;
  require_2fa: boolean;
  aal: string;
  idle_minutes: number;
};

export type Counts = {
  new_orders: number;
  active_orders: number;
  unread_messages: number;
  low_stock: number;
  open_alerts: number;
};

export type AdminContextValue = {
  me: Me;
  can: (area: Area | null) => boolean;
  section: SectionId;
  rest: string[];
  navigate: (section: SectionId, ...rest: (string | null | undefined)[]) => void;
  counts: Counts;
  refreshCounts: () => void;
  reloadMe: () => Promise<void>;
  theme: "system" | "light" | "dark";
  setTheme: (theme: "system" | "light" | "dark") => void;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin outside AdminApp");
  return value;
}

export function roleLabel(role: string): string {
  return role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Support";
}
