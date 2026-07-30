"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
  availability: string;
  image_url: string | null;
  sort_order: number;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/landing/doctors")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setDoctors(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white p-6 text-center card-shadow animate-pulse"
                >
                  <div className="mx-auto h-[120px] w-[120px] rounded-full bg-gray-200" />
                  <div className="mt-5 mx-auto h-5 w-32 rounded bg-gray-200" />
                  <div className="mt-2 mx-auto h-4 w-24 rounded bg-gray-200" />
                  <div className="mt-3 mx-auto h-5 w-28 rounded-full bg-gray-200" />
                  <div className="mt-3 mx-auto h-3 w-40 rounded bg-gray-200" />
                  <div className="mt-4 h-9 w-full rounded-lg bg-gray-200" />
                </div>
              ))
            : doctors.map((doctor, idx) => (
                <div
                  key={doctor.id}
                  className="group rounded-xl bg-white p-6 text-center transition-all duration-300 card-shadow hover:card-shadow-hover hover:-translate-y-1"
                >
                  <div className="mx-auto h-[120px] w-[120px] overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-md transition-transform group-hover:scale-105">
                    <img
                      src={doctor.image_url || `/images/doctors/doctor-${(idx % 4) + 1}.svg`}
                      alt={doctor.name}
                      className="h-full w-full object-cover"
                    />
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
                    href="/login"
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
