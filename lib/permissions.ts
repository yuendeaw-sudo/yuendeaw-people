/**
 * Permission model (mirrors the DB).
 * A permission key is `${module}:${action}`.
 * Owner short-circuits everything.
 */
export type PermAction =
  | "view" | "create" | "edit" | "delete" | "approve" | "export" | "sensitive_view";

export type AccessContext = {
  userId: string;
  email: string;
  fullName: string | null;
  isOwner: boolean;
  employeeId: string | null;
  /** flat set of `${module}:${action}` granted to this user */
  perms: Set<string>;
};

export function can(ctx: AccessContext, module: string, action: PermAction): boolean {
  if (ctx.isOwner) return true;
  return ctx.perms.has(`${module}:${action}`);
}

/** Navigation definition — each item declares the module it gates on. */
export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: string; // lucide-react icon name
  /** module required to see the item (view action). Omit = always visible. */
  module?: string;
  /** owner-only item */
  ownerOnly?: boolean;
};

export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "ของฉัน",
    items: [
      { key: "dashboard", label: "หน้าหลัก", href: "/dashboard", icon: "LayoutDashboard" },
      { key: "profile", label: "โปรไฟล์ของฉัน", href: "/profile", icon: "User" },
      { key: "quests", label: "Growth Quest", href: "/quests", icon: "Target" },
      { key: "leave", label: "เวลา & การลา", href: "/time-leave", icon: "CalendarClock" },
      { key: "handbook", label: "คู่มือพนักงาน", href: "/handbook", icon: "BookOpen" },
    ],
  },
  {
    section: "บริหารคน",
    items: [
      { key: "people", label: "บุคคลากร", href: "/people", icon: "Users", module: "people" },
      { key: "applications", label: "ใบสมัคร", href: "/applications", icon: "FileUser", module: "applications" },
      { key: "performance", label: "Performance", href: "/performance", icon: "Target", ownerOnly: true },
      { key: "rewards", label: "รางวัล & สวัสดิการ", href: "/rewards", icon: "Gift", module: "rewards" },
      { key: "incidents", label: "วินัย & เหตุการณ์", href: "/incidents", icon: "ShieldAlert", module: "incidents" },
    ],
  },
  {
    section: "เครื่องมือ",
    items: [
      { key: "ai", label: "AI Workplace", href: "/ai-workplace", icon: "Sparkles", module: "ai_workplace" },
      { key: "knowledge", label: "Knowledge Base", href: "/knowledge", icon: "Library", module: "knowledge" },
      { key: "subscriptions", label: "Subscriptions", href: "/subscriptions", icon: "CreditCard", module: "subscriptions" },
      { key: "assets", label: "ทรัพย์สินบริษัท", href: "/assets", icon: "Boxes", module: "assets" },
    ],
  },
  {
    section: "ผู้บริหาร",
    items: [
      { key: "payroll", label: "Payroll", href: "/payroll", icon: "Wallet", module: "finance" },
      { key: "owner", label: "Owner Room", href: "/owner", icon: "Crown", ownerOnly: true },
      { key: "admin", label: "ตั้งค่าระบบ", href: "/admin", icon: "Settings", module: "admin_settings" },
    ],
  },
];

export function visibleNav(ctx: AccessContext) {
  return NAV.map((group) => ({
    section: group.section,
    items: group.items.filter((item) => {
      if (item.ownerOnly) return ctx.isOwner;
      if (!item.module) return true; // personal items — everyone
      return can(ctx, item.module, "view");
    }),
  })).filter((g) => g.items.length > 0);
}
