import {
  Ambulance,
  Heart,
  Brain,
  Bone,
  Stethoscope,
  Shield,
  Baby,
  Activity,
  Microscope,
} from "lucide-react";

const services = [
  {
    icon: Ambulance,
    title: "Emergency Care",
    description:
      "24/7 emergency response team equipped to handle critical care and life-saving interventions.",
  },
  {
    icon: Heart,
    title: "Cardiology",
    description:
      "Expert cardiac care with advanced diagnostic and treatment options for heart-related conditions.",
  },
  {
    icon: Brain,
    title: "Neurology",
    description:
      "Specialized neurological care for disorders of the brain, spine, and nervous system.",
  },
  {
    icon: Bone,
    title: "Orthopaedics",
    description:
      "Comprehensive orthopaedic care for bone, joint, and muscle conditions.",
  },
  {
    icon: Stethoscope,
    title: "General Medicine",
    description:
      "Professional general medicine services with the latest technology and experienced physicians.",
  },
  {
    icon: Shield,
    title: "Surgery",
    description:
      "Professional surgical services with the latest technology and skilled surgical teams.",
  },
  {
    icon: Baby,
    title: "Maternity Care",
    description:
      "Professional maternity care services from prenatal checkups to delivery and postnatal support.",
  },
  {
    icon: Activity,
    title: "Pediatrics",
    description:
      "Professional pediatric care services with the latest technology for children's health.",
  },
  {
    icon: Microscope,
    title: "Diagnostics",
    description:
      "Professional diagnostics services with the latest technology for accurate and timely results.",
  },
];

export default function Services() {
  return (
    <section id="services" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary-lighter px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Our Specialized Services
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-[#1F2D3D]">
            Our Medical Services
          </h2>
          <p className="mt-3 text-[#6B7A90] leading-relaxed">
            We offer professional medical services with the latest technology, delivered
            by our team of expert doctors and compassionate caregivers.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="group rounded-xl bg-white p-6 md:p-7 transition-all duration-300 card-shadow hover:card-shadow-hover hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-lighter text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon size={28} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#1F2D3D]">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7A90]">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
