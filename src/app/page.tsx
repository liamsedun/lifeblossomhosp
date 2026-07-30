import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Services from "@/components/landing/services";
import ClinicBanner from "@/components/landing/clinic-banner";
import Gallery from "@/components/landing/gallery";
import Facilities from "@/components/landing/facilities";
import Doctors from "@/components/landing/doctors";
import Testimonials from "@/components/landing/testimonials";
import HealthTips from "@/components/landing/health-tips";
import Contact from "@/components/landing/contact";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <ClinicBanner />
      <Gallery />
      <Facilities />
      <Doctors />
      <Testimonials />
      <HealthTips />
      <Contact />
      <Footer />
    </main>
  );
}
