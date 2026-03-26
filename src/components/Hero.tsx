import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, Zap, Shield, TrendingUp } from "lucide-react";

function CountUp({ target, suffix, prefix = "" }: { target: number; suffix: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}{val >= 1000 ? val.toLocaleString("en-IN") : val}{suffix}
    </span>
  );
}

const stats = [
  { value: 15000, suffix: "+", label: "Businesses" },
  { value: 50, suffix: "Cr+", label: "Invoiced", prefix: "₹" },
  { label: "Rating", raw: "4.9★" },
  { value: 28, suffix: "", label: "States" },
];

const Hero = () => (
  <section className="relative overflow-hidden">
    {/* Gradient background */}
    <div className="absolute inset-0"
      style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #8b5cf6 70%, #a78bfa 100%)" }} />

    {/* Dot pattern */}
    <div className="absolute inset-0 opacity-10"
      style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

    {/* Decorative blobs */}
    <div className="absolute top-20 right-10 w-96 h-96 rounded-full opacity-10"
      style={{ background: "radial-gradient(circle, white, transparent)" }} />
    <div className="absolute bottom-0 left-20 w-64 h-64 rounded-full opacity-10"
      style={{ background: "radial-gradient(circle, white, transparent)" }} />

    <div className="relative max-w-7xl mx-auto px-4 pt-32 pb-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">

        {/* Left — Text */}
        <div>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white text-xs font-semibold mb-8 border border-white/20 backdrop-blur-sm"
          >
            <Zap size={12} className="text-yellow-300" />
            Trusted by 15,000+ Indian businesses
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight"
          >
            Generate GST
            <br />
            Invoices{" "}
            <span style={{ color: "#fde68a" }}>Quickly</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-indigo-100 max-w-lg mb-8 leading-relaxed"
          >
            Create professional, GST-compliant invoices in seconds. Auto-calculate taxes, share on WhatsApp, track payments.
          </motion.p>

          {/* Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="space-y-2.5 mb-10"
          >
            {[
              "Unlimited invoices — completely free forever",
              "Compliant with India's GST",
              "Instantly download or share via WhatsApp",
              "UPI QR code on every invoice — free",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-white/90 text-sm font-medium">
                <CheckCircle2 size={16} className="text-emerald-300 flex-shrink-0" />
                {item}
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all"
              style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}
            >
              Generate Invoice →
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl text-sm font-semibold hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Sign In
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-xs text-indigo-200"
          >
            No credit card required · Unlimited free invoices · Setup in 2 minutes
          </motion.p>
        </div>

        {/* Right — Floating Invoice Card */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          {/* Main invoice card */}
          <div className="bg-white rounded-2xl p-6 relative z-10"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-extrabold text-gray-900 text-lg">Invoice</p>
                <p className="text-xs text-gray-400 mt-0.5">Ravi Kumar Traders</p>
                <p className="text-xs text-gray-400">GSTIN: 27AABCU9603R1ZX</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Invoice #</p>
                <p className="font-bold text-indigo-600">INV-1001</p>
                <p className="text-xs text-gray-400 mt-1">24/04/2024</p>
              </div>
            </div>

            {/* Items table */}
            <div className="bg-gray-50 rounded-xl overflow-hidden mb-4">
              <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-indigo-600">
                <span className="text-[10px] font-semibold text-white">Item</span>
                <span className="text-[10px] font-semibold text-white text-center">GST</span>
                <span className="text-[10px] font-semibold text-white text-right">Price</span>
                <span className="text-[10px] font-semibold text-white text-right">Total</span>
              </div>
              {[
                { name: "ABC Product", gst: "18%", price: "₹10,000", total: "₹11,800" },
                { name: "XYZ Service", gst: "18%", price: "₹5,000", total: "₹5,900" },
              ].map((item) => (
                <div key={item.name} className="grid grid-cols-4 gap-2 px-3 py-2.5 border-b border-gray-100 last:border-0">
                  <span className="text-[11px] font-medium text-gray-700">{item.name}</span>
                  <span className="text-[11px] text-gray-500 text-center">{item.gst}</span>
                  <span className="text-[11px] text-gray-700 text-right">{item.price}</span>
                  <span className="text-[11px] font-semibold text-gray-900 text-right">{item.total}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 mb-5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span>₹15,000</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>GST Total</span><span>₹2,700</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-100">
                <span>Grand Total (INR)</span><span className="text-indigo-600">₹17,700</span>
              </div>
            </div>

            {/* Buttons */}
            <button className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mb-2"
              style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>
              Download Invoice →
            </button>
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-2">
              <span>💬</span> Share via WhatsApp
            </button>
          </div>

          {/* Floating badge — revenue */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -left-10 top-10 bg-white rounded-2xl px-4 py-3 z-20"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">₹4.8L</p>
                <p className="text-[10px] text-gray-500">This month</p>
              </div>
            </div>
          </motion.div>

          {/* Floating badge — GST Ready */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
            className="absolute -right-6 bottom-16 bg-white rounded-2xl px-4 py-3 z-20"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Shield size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">GST Ready</p>
                <p className="text-[10px] text-gray-500">Auto-calculated</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>

    {/* Stats bar */}
    <div className="relative border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-2xl md:text-3xl font-extrabold text-white">
                {"raw" in s ? s.raw : <CountUp target={s.value!} suffix={s.suffix!} prefix={"prefix" in s ? s.prefix : ""} />}
              </p>
              <p className="text-sm text-indigo-200 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>

    {/* Bottom wave */}
    <div className="relative h-16 overflow-hidden">
      <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="absolute bottom-0 w-full" preserveAspectRatio="none">
        <path d="M0 64L1440 64L1440 0C1440 0 1080 64 720 64C360 64 0 0 0 0L0 64Z" fill="white" />
      </svg>
    </div>
  </section>
);

export default Hero;