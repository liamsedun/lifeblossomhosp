"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CreditCard, FileText, User, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/patient", label: "Home", icon: Home },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/payments", label: "Payments", icon: CreditCard },
  { href: "/patient/records", label: "Records", icon: FileText },
  { href: "/patient/profile", label: "Profile", icon: User },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full">
          <div>
            <p className="text-sm text-text-secondary">Hello,</p>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-1">
              Grace! <ChevronRight className="w-4 h-4 text-text-secondary" />
            </h1>
          </div>
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-20 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-text-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
