import { Calendar, MessageCircle } from "lucide-react";

const stats = [
  { value: "15+", label: "Years of Excellence" },
  { value: "5", label: "Expert Doctors" },
  { value: "over 1+", label: "Happy Patients" },
  { value: "99%", label: "Satisfaction Rate" },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#0f2a3f]/90 to-[#06223d]/95" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 animate-[heroZoom_20s_ease-in-out_infinite] opacity-30"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1746173098661-45ae0ccb6030?fm=jpg&q=80&w=1920&auto=format&fit=crop')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06223d]/80 via-[#0a1628]/40 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            Now accepting new patients
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-white">
            Quality Healthcare{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-300">
              You Can Trust
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed">
            Your health, our priority – where care meets cure. We are dedicated to providing
            compassionate, world-class medical care with cutting-edge technology
            and a team of expert doctors. Your well-being is our passion.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-emerald-600 hover:shadow-xl hover:shadow-accent/40 active:scale-[0.97] w-full sm:w-auto justify-center"
            >
              <Calendar size={18} />
              Book Appointment
            </a>
            <a
              href="https://wa.me/2349058038476"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl border-2 border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-accent hover:bg-accent hover:shadow-lg hover:shadow-accent/20 active:scale-[0.97] w-full sm:w-auto justify-center"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-8 md:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center py-6 px-4 bg-white/5"
            >
              <span className="text-2xl md:text-3xl font-bold text-white">
                {stat.value}
              </span>
              <span className="mt-1 text-xs md:text-sm text-white/65">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
