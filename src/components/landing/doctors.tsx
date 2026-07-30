import { Calendar } from "lucide-react";

const doctors = [
  {
    name: "Dr. Sarah Johnson",
    initials: "SJ",
    specialty: "Cardiologist",
    available: true,
    availability: "Available Mon–Fri, 9 AM – 4 PM",
  },
  {
    name: "Dr. Michael Okonkwo",
    initials: "MO",
    specialty: "Pediatrician",
    available: true,
    availability: "Available Mon–Sat, 8 AM – 3 PM",
  },
  {
    name: "Dr. Amina Bello",
    initials: "AB",
    specialty: "Gynecologist",
    available: false,
    availability: "Available Tue–Thu, 10 AM – 5 PM",
  },
  {
    name: "Dr. James Obi",
    initials: "JO",
    specialty: "General Surgeon",
    available: true,
    availability: "Available Mon–Fri, 8 AM – 5 PM",
  },
];

export default function Doctors() {
  return (
    <section id="doctors" className="relative py-20 md:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-[0.03]"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1778151270902-cb0ca572f2ee?fm=jpg&q=80&w=1920&auto=format&fit=crop')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="relative z-10 mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary-lighter px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Our Team
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1F2D3D]">
            Our Expert Doctors
          </h2>
          <p className="mt-3 text-[#6B7A90] leading-relaxed">
            Meet our team of highly qualified and compassionate medical
            professionals dedicated to your health.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.map((doctor) => (
            <div
              key={doctor.name}
              className="group rounded-xl bg-white p-6 text-center transition-all duration-300 card-shadow hover:card-shadow-hover hover:-translate-y-1"
            >
              <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-2xl font-bold text-white shadow-md transition-transform group-hover:scale-105">
                {doctor.initials}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#1F2D3D]">
                {doctor.name}
              </h3>
              <p className="text-sm text-[#6B7A90]">{doctor.specialty}</p>

              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  doctor.available
                    ? "bg-accent-light text-accent"
                    : "bg-warning-light text-warning"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    doctor.available ? "bg-accent" : "bg-warning"
                  }`}
                />
                {doctor.available ? "Available" : "Limited Availability"}
              </span>

              <p className="mt-3 text-xs text-[#6B7A90]">
                {doctor.availability}
              </p>

              <a
                href="#book"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-lighter px-4 py-2.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white w-full"
              >
                <Calendar size={14} />
                Book Appointment
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
