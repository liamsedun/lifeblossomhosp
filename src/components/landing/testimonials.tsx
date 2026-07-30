import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Grace A.",
    quote:
      "The care I received at Life Blossom was outstanding. From the warm welcome at reception to the thorough consultation with my doctor, every moment was handled with professionalism and compassion.",
    rating: 5,
  },
  {
    name: "Chuka M.",
    quote:
      "I brought my son in for an emergency late at night and the team was incredibly fast and efficient. They stabilized him within minutes. I will forever be grateful for their swift response.",
    rating: 5,
  },
  {
    name: "Fatima D.",
    quote:
      "The maternity wing is simply wonderful. The nurses cheered me on through delivery and made sure I was comfortable throughout my stay. It felt like family.",
    rating: 5,
  },
  {
    name: "Samuel T.",
    quote:
      "After years of searching for answers to my health challenges, the diagnostic team at Life Blossom finally identified the issue. Their advanced equipment and skilled staff made all the difference.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-20 md:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-[0.03]"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1777269749032-d8d458ae594d?fm=jpg&q=60&w=1920&auto=format&fit=crop')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary-lighter px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1F2D3D]">
            What Our Patients Say
          </h2>
          <p className="mt-3 text-[#6B7A90] leading-relaxed">
            Real stories from the people we&apos;ve had the privilege to care
            for.
          </p>
        </div>

        <div className="mt-12 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group relative min-w-[300px] md:min-w-[340px] flex-1 snap-start rounded-xl bg-white p-7 transition-all duration-300 card-shadow hover:card-shadow-hover"
            >
              <Quote
                size={28}
                className="absolute top-5 right-5 text-[#E5EAF0]"
              />

              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="fill-[#F39C12] text-[#F39C12]"
                  />
                ))}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#6B7A90] italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1F2D3D]">
                    {t.name}
                  </p>
                  <p className="text-xs text-[#6B7A90]">Patient</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
