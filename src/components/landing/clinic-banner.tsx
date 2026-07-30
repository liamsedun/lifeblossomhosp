export default function ClinicBanner() {
  return (
    <section className="relative h-[400px] md:h-[500px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed scale-110"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/11722768/pexels-photo-11722768.jpeg?w=1920&auto=compress')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      <div className="relative z-10 flex h-full items-center mx-auto max-w-7xl px-5">
        <div className="max-w-xl">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
            Why Choose Us
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white leading-tight">
            Experienced & Certified Doctors
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-lg">
            24/7 Emergency & Intensive Care — We are always here for you with
            cutting-edge medical facilities and compassionate professionals.
          </p>
          <div className="mt-6 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-white/75">24/7 Emergency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-white/75">Expert Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-white/75">Modern Facilities</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
