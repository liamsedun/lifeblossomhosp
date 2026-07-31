import { Globe, Heart } from "lucide-react";
import Logo from "@/components/ui/logo";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "/about" },
  { label: "Services", href: "#services" },
  { label: "Our Doctors", href: "#doctors" },
  { label: "Contact", href: "#contact" },
  { label: "Book Appointment", href: "/login" },
];

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

const socialLinks = [
  { icon: Globe, href: "https://lifeblossomcares.com.ng", label: "Website", external: true },
  { icon: FacebookIcon, href: "https://www.facebook.com/lifeblossomcaresandcure", label: "Facebook", external: true },
  { icon: InstagramIcon, href: "https://www.instagram.com/lifeblossomcaresandcure", label: "Instagram", external: true },
  { icon: XIcon, href: "https://x.com/lifeblossomcaresandcure", label: "X (Twitter)", external: true },
];

export default function Footer() {
  return (
    <footer className="bg-[#0B2A4A] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 md:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <a href="#home" className="flex items-center gap-2.5">
              <Logo variant="inline" iconSize={28} textClass="!text-white text-lg font-bold" subtitleClass="!text-white/60" />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Dedicated to providing compassionate, world-class healthcare to
              our community. Your health is our mission.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Quick Links
            </h4>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Contact Info
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
               <li>20 Fatade Road, Baruwa-Ipaja</li>
               <li>Lagos State, Nigeria</li>
              <li>Nigeria</li>
              <li>
                <a
                   href="tel:+2349058038476"
                   className="transition-colors hover:text-accent"
                 >
                   +234 905 803 8476
                </a>
              </li>
              <li>
                <a
                   href="mailto:hello@lifeblossomcares.com.ng"
                  className="transition-colors hover:text-accent"
                >
                  hello@lifeblossomcares.com.ng
                </a>
              </li>
              <li>
                <a
                   href="https://www.lifeblossomcares.com.ng"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="transition-colors hover:text-accent"
                >
                  www.lifeblossomcares.com.ng
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Follow Us
            </h4>
            <div className="mt-5 flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-all hover:bg-accent hover:text-white"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              Stay connected with us on social media for health tips, updates,
              and community news.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>&copy; {new Date().getFullYear()} Life Blossom Care and Cure Hospital. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart size={12} className="text-danger" /> for our community
          </p>
        </div>
      </div>
    </footer>
  );
}
