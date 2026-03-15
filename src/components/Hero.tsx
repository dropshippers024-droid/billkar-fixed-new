import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Users, IndianRupee, TrendingUp, BarChart3, Clock } from "lucide-react";

function CountUp({ target, suffix }: { target: number; suffix: string }) {
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
      {val >= 1000 ? val.toLocaleString("en-IN") : val}{suffix}
    </span>
  );
}

const stats = [
  { value: 2000, suffix: "+", label: "Businesses" },
  { value: 50, suffix: "Cr+", label: "Invoiced", prefix: "₹" },
  { label: "Rating", raw: "4.9\u2605" },
  { value: 28, suffix: "", label: "States" },
];

const Hero = () => (
  <section className="bg-white pt-28 pb-0">
    <div className="max-w-6xl mx-auto px-4 text-center">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium mb-8 border border-indigo-100"
      >
        Trusted by 2,000+ Indian businesses
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl md:text-6xl font-extrabold text-gray-900 max-w-4xl mx-auto leading-[1.1] mb-6"
      >
        The Fastest Way to Create{" "}
        <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
          GST Invoices
        </span>{" "}
        for Your Business
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10"
      >
        Create professional, GST-compliant invoices in under 30 seconds. Auto-calculate taxes, share on WhatsApp, track payments — all in one place.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4"
      >
        <Link
          to="/signup"
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          Start Free — 50 Invoices/Month →
        </Link>
        <a
          href="#features"
          className="bg-white border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          See How It Works
        </a>
      </motion.div>

      {/* Trust text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-xs text-gray-400 mb-14"
      >
        No credit card required · Setup in 2 minutes · Cancel anytime
      </motion.p>

      {/* Dashboard mockup — looks like BillKar app */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="max-w-4xl mx-auto"
      >
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-gray-900">Bill<span className="text-gradient-primary">Kar</span></span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-[9px] font-bold text-indigo-600">RS</span>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "This Month Revenue", value: "₹4,82,500", icon: IndianRupee, change: "+23%", up: true },
                { label: "Total Invoices", value: "87", icon: FileText, change: "+12", up: true },
                { label: "Active Customers", value: "23", icon: Users, change: "+3", up: true },
                { label: "Avg. Payment Time", value: "4.2 days", icon: Clock, change: "-1.5d", up: true },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <s.icon size={14} className="text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-medium text-emerald-600">{s.change}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recent invoices table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-700">Recent Invoices</span>
                <span className="text-[10px] text-indigo-600 font-medium">View All →</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { id: "INV-2024-087", name: "Ace Traders", amount: "₹8,500", status: "Paid", sc: "bg-emerald-50 text-emerald-700", date: "Today" },
                  { id: "INV-2024-086", name: "Metro Supplies", amount: "₹12,000", status: "Sent", sc: "bg-blue-50 text-blue-700", date: "Yesterday" },
                  { id: "INV-2024-085", name: "City Retail", amount: "₹6,200", status: "Overdue", sc: "bg-red-50 text-red-600", date: "3 days ago" },
                  { id: "INV-2024-084", name: "Star Electronics", amount: "₹15,800", status: "Paid", sc: "bg-emerald-50 text-emerald-700", date: "5 days ago" },
                ].map((r) => (
                  <div key={r.id} className="grid grid-cols-5 text-[11px] md:text-xs px-4 py-2.5 items-center">
                    <span className="font-medium text-gray-800">{r.id}</span>
                    <span className="text-gray-500 truncate">{r.name}</span>
                    <span className="text-right font-semibold text-gray-800">{r.amount}</span>
                    <span className="text-center text-gray-400">{r.date}</span>
                    <span className="text-right"><span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${r.sc}`}>{r.status}</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom stats */}
            <div className="flex items-center justify-between mt-4 px-1">
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <TrendingUp size={12} className="text-emerald-600" />
                <span>Revenue up <span className="text-emerald-600 font-semibold">23%</span> from last month</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <BarChart3 size={12} className="text-indigo-500" />
                <span><span className="font-semibold text-gray-700">92%</span> collection rate</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

    {/* Social Proof Stats */}
    <div className="bg-gray-50 mt-20 py-10 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-sm text-gray-400 text-center mb-8">Powering businesses across India</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-gray-900">
                {"prefix" in s && s.prefix ? s.prefix : ""}
                {"raw" in s ? s.raw : <CountUp target={s.value!} suffix={s.suffix!} />}
              </p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
