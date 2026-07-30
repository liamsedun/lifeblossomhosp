import { Globe, MessageCircle, Camera, Play, Heart } from "lucide-react";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Our Doctors", href: "#doctors" },
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
  { label: "Book Appointment", href: "#book" },
];

const socialLinks = [
  { icon: Globe, href: "#", label: "Facebook" },
  { icon: MessageCircle, href: "#", label: "Twitter / X" },
  { icon: Camera, href: "#", label: "Instagram" },
  { icon: Play, href: "#", label: "YouTube" },
];

export default function Footer() {
  return (
    <footer className="bg-[#0B2A4A] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 md:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <a href="#home" className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-white text-sm font-bold">
                LB
              </div>
              <span className="text-lg font-bold">Life Blossom</span>
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
                   href="mailto:lifeblossomcarencurehospital@mail.com"
                  className="transition-colors hover:text-accent"
                >
                  info@lifeblossomhospital.com
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
                    aria-label={social.label}
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
