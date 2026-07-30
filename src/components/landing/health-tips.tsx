import { Droplets, Apple, Moon, Footprints, Brain, CalendarCheck } from "lucide-react";

const tips = [
  {
    icon: Droplets,
    title: "Stay Hydrated",
    description:
      "Drink at least 8 glasses of water daily to keep your body functioning at its best.",
  },
  {
    icon: Apple,
    title: "Eat a Balanced Diet",
    description:
      "Fill your plate with fruits, vegetables, lean proteins, and whole grains for optimal health.",
  },
  {
    icon: Moon,
    title: "Get Enough Sleep",
    description:
      "Aim for 7-9 hours of quality sleep each night to boost immunity and brain function.",
  },
  {
    icon: Footprints,
    title: "Stay Active",
    description:
      "Exercise regularly, even if it's just a daily walk, to keep your heart and muscles strong.",
  },
  {
    icon: Brain,
    title: "Manage Stress",
    description:
      "Practice mindfulness, deep breathing, or hobbies to maintain mental well-being.",
  },
  {
    icon: CalendarCheck,
    title: "Schedule Regular Check-Ups",
    description:
      "Prevention is key! Regular medical check-ups help detect and prevent health issues early.",
  },
];

export default function HealthTips() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-accent-light px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            Health Tips
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1F2D3D]">
            6 Essential Health Tips for a Better Life
          </h2>
          <p className="mt-3 text-[#6B7A90] leading-relaxed">
            Small daily habits lead to big health improvements. Here are our top
            recommendations for a healthier, happier you.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className="group rounded-xl bg-white p-6 md:p-7 transition-all duration-300 card-shadow hover:card-shadow-hover hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
                    {index + 1}
                  </span>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-light text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <Icon size={24} />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#1F2D3D]">
                  {tip.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7A90]">
                  {tip.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
