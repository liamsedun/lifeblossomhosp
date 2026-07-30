import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";

export default function Contact() {
  return (
    <section id="contact" className="relative py-20 md:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-[0.04]"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1766299892683-d50398e31823?fm=jpg&q=80&w=1920&auto=format&fit=crop')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="relative z-10 mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary-lighter px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Get in Touch
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1F2D3D]">
            Contact Us
          </h2>
          <p className="mt-3 text-[#6B7A90] leading-relaxed">
            We&apos;re here to help. Reach out to us through any of the channels
            below.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl card-shadow">
            <iframe
              title="Hospital Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.822!2d3.26996!3d6.60074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b911597b465d1%3A0xad804ee4ad7e5a7!2sLife%20Blossom%20Care%20and%20Cure%20Hospital!5e0!3m2!1sen!2sng!4v1"
              width="100%"
              height="100%"
              className="min-h-[300px] lg:min-h-[400px]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex flex-col justify-center gap-6 rounded-xl bg-white p-8 card-shadow">
            <h3 className="text-xl font-bold text-[#1F2D3D]">
              Visit or Reach Us
            </h3>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-lighter text-primary">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2D3D]">
                    Address
                  </p>
                  <p className="text-sm text-[#6B7A90]">
                    20 Fatade Road, Baruwa-Ipaja, Lagos State, Nigeria
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-lighter text-primary">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2D3D]">Phone</p>
                  <p className="text-sm text-[#6B7A90]">
                    +234 905 803 8476
                  </p>
                  <p className="text-sm text-[#6B7A90]">
                    +234 902 803 8476
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-lighter text-primary">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2D3D]">Email</p>
                  <p className="text-sm text-[#6B7A90]">
                    lifeblossomcarencurehospital@mail.com
                  </p>
                  <p className="text-sm text-[#6B7A90]">
                    lifeblossomcarencurehospital@mail.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-lighter text-primary">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2D3D]">
                    Working Hours
                  </p>
                  <p className="text-sm text-[#6B7A90]">
                    Open 24/7 – Always here for you
                  </p>
                  <p className="text-sm text-[#6B7A90]">
                    Emergency: 24/7
                  </p>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/2349058038476"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-emerald-600 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.97]"
            >
              <MessageCircle size={18} />
              Chat with Us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
