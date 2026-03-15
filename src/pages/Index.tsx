import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhyBillKar from "@/components/WhyBillKar";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import ComparisonTable from "@/components/ComparisonTable";
import BusinessTypes from "@/components/BusinessTypes";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen bg-white text-gray-900">
    <Navbar />
    <Hero />
    <WhyBillKar />
    <Features />
    <HowItWorks />
    <ComparisonTable />
    <BusinessTypes />
    <Testimonials />
    <Pricing />
    <CTABanner />
    <Footer />
  </div>
);

export default Index;
