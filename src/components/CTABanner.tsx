import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";

const CTABanner = () => (
  <section className="py-6 px-4 md:px-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl py-16 px-8 text-center max-w-6xl mx-auto"
      style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)", boxShadow: "0 20px 60px rgba(99,102,241,0.35)" }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
      <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute right-1/4 top-0 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
          <Zap size={12} className="text-yellow-300" />
          Free forever · No credit card needed
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
          Ready to simplify your billing?
        </h2>
        <p className="text-indigo-200 text-lg mb-8 max-w-md mx-auto">
          Join 15,000+ businesses billing smarter with BillKar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/signup"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all w-full sm:w-auto justify-center"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
            Start Free — 50 Invoices/Month <ArrowRight size={16} />
          </Link>
          <Link to="/login"
            className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all w-full sm:w-auto justify-center backdrop-blur-sm">
            Sign In
          </Link>
        </div>

        <p className="text-indigo-300 text-xs mt-5">
          No setup fees · Cancel anytime · GST compliant
        </p>
      </div>
    </motion.div>
  </section>
);

export default CTABanner;