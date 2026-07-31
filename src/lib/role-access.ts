import type { UserRole } from "./api-types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

/**
 * Each nav item lists which roles can see it.
 * Order matters for sidebar display.
 */
export const NAV_ACCESS: NavItem[] = [
  { label: "Dashboard",     href: "/admin",             icon: "LayoutDashboard", roles: ["super_admin", "admin", "doctor", "accountant"] },
  { label: "Patients",      href: "/admin/patients",    icon: "Users",           roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Appointments",  href: "/admin/appointments",icon: "CalendarDays",    roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Billing",       href: "/admin/billing",     icon: "Wallet",          roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Expenses",      href: "/admin/expenses",    icon: "Receipt",         roles: ["super_admin", "admin", "accountant"] },
  { label: "Other Income",  href: "/admin/other-income",icon: "Gift",            roles: ["super_admin", "admin", "accountant"] },
  { label: "Internal Mail", href: "/admin/internal-mail",icon: "Mail",           roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Live Chat",     href: "/admin/chats",        icon: "MessageSquare",  roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Staff",         href: "/admin/staff",       icon: "Stethoscope",     roles: ["super_admin", "admin", "accountant"] },
  { label: "Reports",       href: "/admin/reports",     icon: "BarChart3",       roles: ["super_admin", "admin", "accountant"] },
  { label: "Settings",      href: "/admin/settings",    icon: "Settings",        roles: ["super_admin"] },
  { label: "Profile",       href: "/admin/profile",     icon: "UserCircle",      roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
];

/** Get nav items visible to a given role */
export function getNavForRole(role?: UserRole | null): NavItem[] {
  if (!role) return [];
  return NAV_ACCESS.filter((item) => item.roles.includes(role));
}

/** Roles that can access general admin (dashboard + most features) */
export const ADMIN_ROLES: UserRole[] = ["super_admin", "admin"];

/** Roles that are clinical staff (doctor / nurse) */
export const CLINICAL_ROLES: UserRole[] = ["doctor", "nurse"];

/** Roles that have full data visibility (can see all records) */
export const FULL_ACCESS_ROLES: UserRole[] = ["super_admin", "admin", "accountant"];
