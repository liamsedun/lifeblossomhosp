"use client";

import { useState, useEffect } from "react";
import { Menu, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/logo";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "/about" },
  { label: "Services", href: "#services" },
  { label: "Doctors", href: "#doctors" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_2px_16px_rgba(15,76,129,0.08)]"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-5 h-16 md:h-20">
        <a href="#home" className="flex items-center gap-2.5">
          <Logo
            variant="inline"
            iconSize={26}
            hideSubtitle
            textClass={cn(
              "text-lg md:text-xl font-bold tracking-tight transition-colors",
              scrolled ? "text-primary" : "text-white"
            )}
          />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                scrolled ? "text-[#6B7A90]" : "text-white/85 hover:text-white"
              )}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark active:scale-[0.97]"
          >
            <Calendar size={16} />
            Book Appointment
          </a>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "md:hidden p-2 rounded-lg transition-colors",
            scrolled
              ? "text-[#6B7A90] hover:bg-[#F1F4F9]"
              : "text-white hover:bg-white/10"
          )}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          open ? "max-h-80" : "max-h-0"
        )}
      >
        <nav className="flex flex-col gap-1 bg-white px-5 pb-5 pt-2 shadow-lg">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-[#6B7A90] transition-colors hover:bg-[#F1F4F9] hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
          >
            <Calendar size={16} />
            Book Appointment
          </a>
        </nav>
      </div>
    </header>
  );
}
