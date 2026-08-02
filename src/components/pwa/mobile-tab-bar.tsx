"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Wallet,
  Receipt,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/api-types";

interface TabDef {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const TABS: TabDef[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["super_admin", "admin", "doctor", "accountant"] },
  { label: "Appointment", href: "/admin/appointments", icon: CalendarDays, roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Chat", href: "/admin/chats", icon: MessageSquare, roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Billing", href: "/admin/billing", icon: Wallet, roles: ["super_admin", "admin", "doctor", "accountant", "nurse"] },
  { label: "Expenses", href: "/admin/expenses", icon: Receipt, roles: ["super_admin", "admin", "accountant"] },
  { label: "Other Income", href: "/admin/other-income", icon: Gift, roles: ["super_admin", "admin", "accountant"] },
];

function isTabActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const tabs = TABS.filter((t) => !role || t.roles.includes(role));

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              title={tab.label}
              className={cn(
                "relative flex flex-1 items-center justify-center py-3 transition-colors",
                active ? "text-[#e0a84a]" : "text-white/45 hover:text-white/80"
              )}
            >
              {active && (
                <span className="absolute top-0 inset-x-0 h-0.5 rounded-full bg-gradient-to-r from-[#e0a84a]/0 via-[#e0a84a] to-[#e0a84a]/0" />
              )}
              <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
