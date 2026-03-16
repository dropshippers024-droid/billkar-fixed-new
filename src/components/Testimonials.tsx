import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "D2C Founder",
    location: "Mumbai",
    initials: "PS",
    avatarBg: "bg-indigo-100",
    avatarText: "text-indigo-600",
    quote: "BillKar reduced our invoicing time from 10 minutes to 30 seconds. The WhatsApp sharing is a game-changer for my D2C brand.",
    metric: "10x faster invoicing",
  },
  {
    name: "Rajesh Kumar",
    role: "Chartered Accountant",
    location: "Delhi",
    initials: "RK",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-600",
    quote: "As a CA managing 50+ clients, the GSTR-1 export saves me hours every month. Best billing tool I've recommended to my clients.",
    metric: "50+ clients managed",
  },
  {
    name: "Ananya Patel",
    role: "Freelance Designer",
    location: "Bangalore",
    initials: "AP",
    avatarBg: "bg-violet-100",
    avatarText: "text-violet-600",
    quote: "Finally a billing software that understands Indian businesses. Simple, fast, and the free plan is incredibly generous.",
    metric: "Free plan user",
  },
];

const Testimonials = () => (
  <section id="testimonials" className="bg-gray-50 py-24">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 block">Testimonials</span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Loved by Indian businesses
        </h2>
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} size={16} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-sm font-semibold text-gray-700">4.9/5</span>
          <span className="text-sm text-gray-400">from 1,600+ reviews</span>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 relative transition-all"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Quote icon */}
            <div className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Quote size={14} className="text-indigo-400" />
            </div>

            {/* Stars */}
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* Quote */}
            <p className="text-sm text-gray-600 leading-relaxed mb-5">"{t.quote}"</p>

            {/* Metric pill */}
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              ✦ {t.metric}
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <div className={`w-10 h-10 rounded-full ${t.avatarBg} flex items-center justify-center ${t.avatarText} text-sm font-bold flex-shrink-0`}>
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role} · {t.location}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom trust bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16 bg-white rounded-2xl border border-gray-100 p-6 max-w-3xl mx-auto"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
          {[
            { value: "15,000+", label: "Businesses trust BillKar" },
            { value: "₹50Cr+", label: "Invoiced through BillKar" },
            { value: "28", label: "States across India" },
          ].map((s) => (
            <div key={s.label} className="px-4">
              <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default Testimonials;