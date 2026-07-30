"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Stethoscope,
  BarChart3,
  Settings,
  UserCircle,
  Receipt,
  Gift,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Billing", href: "/admin/billing", icon: Wallet },
  { label: "Expenses", href: "/admin/expenses", icon: Receipt },
  { label: "Other Income", href: "/admin/other-income", icon: Gift },
  { label: "Staff", href: "/admin/staff", icon: Stethoscope },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Profile", href: "/admin/profile", icon: UserCircle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#0a0f1a] via-[#0d1322] to-[#0f1a2e]">
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-white/[0.06] bg-[#0d1322]/90 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-white/[0.06] px-6">
          <Logo variant="inline" iconSize={28} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#e0a84a]/20 via-[#e0a84a]/10 to-transparent border border-[#e0a84a]/20" />
                )}
                <span className={cn(
                  "relative z-10 flex items-center justify-center size-[18px] shrink-0 transition-transform duration-200",
                  active && "group-hover:scale-110"
                )}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="relative z-10">{item.label}</span>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-gradient-to-b from-[#e0a84a] to-[#e0a84a]/60" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e0a84a]/40 to-[#e0a84a]/10 blur-sm" />
              <Avatar size="sm" className="relative ring-2 ring-[#e0a84a]/30">
                <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || "User"} />
                <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a] font-semibold">
                  {user ? `${user.first_name[0]}${user.last_name[0]}` : "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">
                {user ? `${user.first_name} ${user.last_name}` : "Loading..."}
              </p>
              <Badge variant="default" className="mt-0.5 text-[10px] px-1.5 py-0 capitalize bg-white/[0.06] text-white/60 border-none">
                {user?.role?.replace("_", " ") || ""}
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/[0.06] bg-[#0d1322]/60 backdrop-blur-xl px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -ml-1 p-1 text-white/50 hover:text-white transition-colors"
          >
            <Menu className="size-5" />
          </button>

          <div className="relative hidden sm:block flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search patients, staff..."
              className="h-9 pl-9 text-sm bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Bell className="size-[18px]" />
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[10px] font-bold text-[#0a0f1a]">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1.5 text-sm text-white/80 hover:bg-white/[0.06] transition-all">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e0a84a]/30 to-transparent blur-[2px]" />
                    <Avatar size="sm" className="relative ring-1 ring-white/10">
                      <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || "User"} />
                      <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a] font-semibold">
                        {user ? `${user.first_name[0]}${user.last_name[0]}` : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="hidden md:inline text-sm font-medium">
                    {user ? user.first_name : "User"}
                  </span>
                  <ChevronDown className="size-4 text-white/40 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white/80">
                <DropdownMenuItem onClick={() => router.push("/admin/profile")} className="hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white">
                  <UserCircle className="size-4 mr-2" />Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/settings")} className="hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white">
                  <Settings className="size-4 mr-2" />Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  className="text-red-400 hover:bg-white/[0.06] hover:text-red-300 focus:bg-white/[0.06] focus:text-red-300"
                  onClick={async () => {
                    await logout();
                    router.push("/staff/login");
                  }}
                >
                  <LogOut className="size-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
