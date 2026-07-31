"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Calendar, MessageCircle, ArrowRight, Eye, HeartHandshake, Target, ShieldCheck,
  HeartPulse, Stethoscope, Building2, Ambulance, Sparkles, GraduationCap, Globe2,
  Users, Award, Clock, Microscope, Baby, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/logo";

const IMG = {
  hero: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?fm=jpg&q=80&w=1920&auto=format&fit=crop",
  team: "https://images.unsplash.com/photo-1579154204601-01588f351e67?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  building: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?fm=jpg&q=80&w=1920&auto=format&fit=crop",
  doctor: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?fm=jpg&q=80&w=1000&auto=format&fit=crop",
  care: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?fm=jpg&q=80&w=1000&auto=format&fit=crop",
  facility: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?fm=jpg&q=80&w=1200&auto=format&fit=crop",
};

const MARQUEE = ["Compassion", "Innovation", "Excellence", "Care", "Cure", "24/7 Emergency", "Patient First"];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({
  children, delay = 0, className,
}: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "revealed", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf: number;
    const start = performance.now();
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <main className="bg-white text-slate-800 overflow-x-hidden">
      <style>{`
        @keyframes kenburns { 0% { transform: scale(1) translate(0,0); } 50% { transform: scale(1.12) translate(-1.5%, 1%); } 100% { transform: scale(1) translate(0,0); } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes shimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .animate-kenburns { animation: kenburns 22s ease-in-out infinite; }
        .animate-floaty { animation: floaty 6s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulseRing 2.4s ease-out infinite; }
        .animate-marquee { animation: marquee 28s linear infinite; }
        .gradient-text { background-size: 200% auto; animation: shimmer 6s ease-in-out infinite; }
        .card-glow:hover { box-shadow: 0 24px 60px -18px rgba(15,76,129,0.35); transform: translateY(-6px); }
      `}</style>

      {/* ── Floating header ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-5 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo variant="inline" iconSize={22} hideSubtitle textClass="text-base md:text-lg font-bold tracking-tight text-primary" />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/2349058038476"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:border-primary hover:text-primary"
            >
              <MessageCircle size={15} /> Chat
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary-dark active:scale-[0.97]"
            >
              <Calendar size={15} /> Book Appointment
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/97 via-[#0f2a3f]/93 to-[#06223d]/97" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-kenburns opacity-40"
          style={{ backgroundImage: `url('${IMG.hero}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06223d]/90 via-[#0a1628]/30 to-transparent" />
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full bg-sky-500/15 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-32 pb-16 md:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm animate-floaty">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Your health, our priority
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-white">
              Life Blossom
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent via-emerald-300 to-sky-300 gradient-text">
                Care &amp; Cure Hospital
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-2xl font-light text-white/80">
              Where <span className="font-semibold text-accent">care</span> meets{" "}
              <span className="font-semibold text-accent">cure</span>
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/login"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-emerald-600 hover:shadow-xl active:scale-[0.97] group"
              >
                <Calendar size={18} />
                Book Appointment
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="https://wa.me/2349058038476"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl border-2 border-white/25 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-accent hover:bg-accent hover:shadow-lg active:scale-[0.97]"
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>
            </div>

            {/* Stats */}
            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: 15, suffix: "+", label: "Years of Excellence" },
                { value: 5, suffix: "+", label: "Expert Doctors" },
                { value: 99, suffix: "%", label: "Satisfaction Rate" },
                { value: 24, suffix: "/7", label: "Emergency Care" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.1] hover:border-accent/40">
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    <Counter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-[11px] md:text-xs font-medium uppercase tracking-wider text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Marquee values strip ── */}
      <div className="relative py-5 bg-white overflow-hidden border-y border-slate-100">
        <div className="flex w-max animate-marquee gap-0">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-6 px-6 text-sm font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">
              <Sparkles size={14} className="text-accent" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── WHO WE ARE ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-40 h-40 rounded-3xl bg-accent/10 blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IMG.team} alt="Life Blossom medical team" className="w-full h-[420px] md:h-[500px] object-cover transition-transform duration-700 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06223d]/60 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-7 -right-4 md:-right-8 rounded-2xl bg-white shadow-xl border border-slate-100 px-5 py-4 animate-floaty">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                    <Users size={22} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary leading-none">5+</p>
                    <p className="text-xs text-slate-500 mt-1">Specialist Doctors</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-6 -left-3 md:-left-6 rounded-2xl bg-white shadow-xl border border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary leading-none">24/7</p>
                    <p className="text-xs text-slate-500 mt-1">Emergency &amp; ICU</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <SectionTag>Who We Are</SectionTag>
              <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-primary">
                A Medical Team That
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Cares Deeply</span>
              </h2>
              <p className="mt-5 text-base md:text-lg leading-relaxed text-slate-600">
                At Life Blossom Care &amp; Cure Hospital, we are committed to providing world-class
                healthcare services with compassion, innovation, and excellence. Our highly skilled
                medical team leverages cutting-edge technology to ensure the best possible patient
                outcomes.
              </p>
            </Reveal>

            <div className="mt-8 space-y-4">
              {[
                { icon: Globe2, title: "Access for All", text: "We hope to expand healthcare access to underserved communities." },
                { icon: GraduationCap, title: "Education & Research", text: "To maintain excellence in medical research and education." },
                { icon: Activity, title: "Continuous Innovation", text: "Enhance patient care through continuous innovation." },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 120}>
                  <div className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 transition-all duration-300 hover:border-accent/40 hover:bg-white hover:shadow-lg hover:shadow-accent/10">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#1e6fb0] text-white flex items-center justify-center shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <item.icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VISION · MISSION · GOALS ── */}
      <section className="py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] via-white to-[#eefaf3]" />
        <div className="absolute top-24 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute bottom-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-5">
          <Reveal className="text-center max-w-2xl mx-auto">
            <SectionTag>What Drives Us</SectionTag>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-primary">
              Vision, Mission &amp; Goals
            </h2>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Reveal delay={0}>
              <div className="card-glow h-full rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-primary text-white flex items-center justify-center shadow-lg shadow-primary/25">
                  <Eye size={26} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-800">Our Vision</h3>
                <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">
                  To be a leading healthcare provider, setting the gold standard in medical
                  excellence, patient care, and innovation.
                </p>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="card-glow h-full rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 md:-translate-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-accent text-white flex items-center justify-center shadow-lg shadow-accent/25">
                  <HeartHandshake size={26} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-800">Our Mission</h3>
                <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">
                  To deliver exceptional and compassionate healthcare services, ensuring the
                  well-being and recovery of our patients through advanced medical practices and a
                  dedicated team.
                </p>
              </div>
            </Reveal>

            <Reveal delay={280}>
              <div className="card-glow h-full rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Target size={26} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-800">Our Goals</h3>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Enhance patient care through continuous innovation.",
                    "Ensure affordability without compromising quality.",
                    "Promote a patient-first approach in all services.",
                  ].map((g) => (
                    <li key={g} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOSPITAL BUILDING (banner) ── */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${IMG.building}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06223d]/95 via-[#0a1628]/85 to-[#06223d]/70" />
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <Reveal>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm">
                <Building2 size={13} className="text-accent" />
                Hospital Building
              </div>
              <h2 className="mt-5 text-3xl md:text-5xl font-bold leading-tight text-white">
                Life Blossom
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-300 gradient-text">
                  Care &amp; Cure Hospital
                </span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-white/80 leading-relaxed">
                At Life Blossom Care &amp; Cure Hospital, we are dedicated to providing world-class
                healthcare services with a focus on{" "}
                <strong className="text-accent">compassion, innovation, and excellence</strong>. Our
                team of expert doctors, nurses, and healthcare professionals work tirelessly to
                ensure the well-being of every patient.
              </p>
              <a
                href="/login"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-emerald-600 hover:shadow-xl active:scale-[0.97] group"
              >
                Visit Us Today
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE LIFE BLOSSOM ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="text-center max-w-2xl mx-auto">
            <SectionTag>Why Choose Life Blossom?</SectionTag>
            <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-primary">
              Care That Puts You First
            </h2>
            <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed">
              Our patients are at the heart of everything we do. With cutting-edge medical
              facilities, compassionate professionals, and a commitment to innovation, we ensure
              that you receive the best possible care.
            </p>
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Stethoscope, title: "Expert Doctors", text: "Experienced and certified doctors in every specialty.", color: "from-sky-500 to-primary" },
              { icon: Ambulance, title: "24/7 Emergency", text: "Round-the-clock emergency and intensive care, always ready.", color: "from-rose-500 to-red-600" },
              { icon: Microscope, title: "Modern Facilities", text: "Cutting-edge diagnostics, labs, and medical technology.", color: "from-emerald-500 to-accent" },
              { icon: HeartPulse, title: "Patient First", text: "Compassionate, affordable care built around your needs.", color: "from-violet-500 to-purple-600" },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 110}>
                <div className="group card-glow relative h-full overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-sm transition-all duration-300">
                  <div className={cn("absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-20", "bg-gradient-to-br", f.color)} />
                  <div className={cn("relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3", "bg-gradient-to-br", f.color)}>
                    <f.icon size={28} />
                  </div>
                  <h3 className="relative mt-5 font-bold text-slate-800">{f.title}</h3>
                  <p className="relative mt-2 text-sm text-slate-500 leading-relaxed">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR DOCTORS · PATIENT CARE · HOSPITAL FACILITY ── */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-[#f0f7ff] to-white">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="text-center max-w-2xl mx-auto">
            <SectionTag>Inside Life Blossom</SectionTag>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-primary">
              World-Class Care, In Every Detail
            </h2>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-7">
            {/* Our Doctors */}
            <Reveal delay={0}>
              <div className="group card-glow overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 h-full flex flex-col">
                <div className="relative h-60 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMG.doctor} alt="Our Doctors" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06223d]/70 to-transparent" />
                  <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-bold text-primary">
                    <Award size={14} className="text-accent" /> Certified
                  </div>
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center">
                    <Stethoscope size={22} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-800">Our Doctors</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
                    Experienced &amp; certified doctors dedicated to your health and recovery.
                  </p>
                  <a
                    href="/login"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-accent group/link"
                  >
                    More info
                    <ArrowRight size={15} className="transition-transform group-hover/link:translate-x-1" />
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Patient Care */}
            <Reveal delay={130}>
              <div className="group card-glow overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 h-full flex flex-col md:-translate-y-4">
                <div className="relative h-60 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMG.care} alt="Patient Care" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06223d]/70 to-transparent" />
                  <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-bold text-primary">
                    <Clock size={14} className="text-accent" /> Always On
                  </div>
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
                    <HeartPulse size={22} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-800">Patient Care</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
                    24/7 emergency &amp; intensive care with rapid-response medical teams.
                  </p>
                  <a
                    href="https://wa.me/2349058038476"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-accent group/link"
                  >
                    More info
                    <ArrowRight size={15} className="transition-transform group-hover/link:translate-x-1" />
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Hospital Facility */}
            <Reveal delay={260}>
              <div className="group card-glow overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 h-full flex flex-col">
                <div className="relative h-60 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={IMG.facility} alt="Hospital Facility" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06223d]/70 to-transparent" />
                  <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-bold text-primary">
                    <Building2 size={14} className="text-accent" /> Modern
                  </div>
                </div>
                <div className="p-7 flex flex-col flex-1">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Building2 size={22} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-800">Hospital Facility</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
                    Modern wards, advanced diagnostics, and comfortable recovery spaces.
                  </p>
                  <a
                    href="/login"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-accent group/link"
                  >
                    More info
                    <ArrowRight size={15} className="transition-transform group-hover/link:translate-x-1" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2a3f] to-[#06223d]" />
        <div className="absolute -top-20 right-10 w-80 h-80 rounded-full bg-accent/15 blur-[110px]" />
        <div className="absolute -bottom-24 left-10 w-80 h-80 rounded-full bg-sky-500/15 blur-[110px]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <Reveal>
            <Baby size={40} className="mx-auto text-accent" />
            <h2 className="mt-6 text-3xl md:text-5xl font-bold text-white leading-tight">
              Your health, our priority —{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-300 gradient-text">
                where care meets cure
              </span>
            </h2>
            <p className="mt-5 text-white/70 text-base md:text-lg">
              Join the Life Blossom family today and experience healthcare that truly cares.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/login"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:bg-emerald-600 active:scale-[0.97]"
              >
                <Calendar size={18} /> Book Appointment
              </a>
              <a
                href="/"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/60"
              >
                Explore Our Services
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#050e1d] text-white/60">
        <div className="mx-auto max-w-7xl px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo variant="inline" iconSize={20} hideSubtitle textClass="text-base font-bold tracking-tight text-white" />
          </Link>
          <p className="text-xs text-center md:text-right">
            © {new Date().getFullYear()} Life Blossom Care &amp; Cure Hospital. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
