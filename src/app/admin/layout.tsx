"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Stethoscope,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Billing", href: "/admin/billing", icon: Wallet },
  { label: "Staff", href: "/admin/staff", icon: Stethoscope },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            LB
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Life Blossom
            </p>
            <p className="text-[11px] text-text-secondary leading-tight">
              Care &amp; Cure Hospital
            </p>
          </div>
        </div>

        {/* Navigation */}
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
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-lighter text-primary border-l-[3px] border-primary ml-0 pl-[calc(0.75rem-3px)]"
                    : "text-text-secondary hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarImage src="" alt="Admin" />
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Dr. Rebecca Adams
              </p>
              <Badge variant="default" className="mt-0.5 text-[10px] px-1.5 py-0">
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -ml-1 p-1 text-text-secondary hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>

          <div className="relative hidden sm:block flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search patients, staff..."
              className="h-9 pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-text-secondary hover:text-foreground"
            >
              <Bell className="size-[18px]" />
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <Avatar size="sm">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback>DR</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">
                    Dr. Adams
                  </span>
                  <ChevronDown className="size-4 text-text-secondary hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
