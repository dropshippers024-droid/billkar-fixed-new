import { motion } from "framer-motion";
import { Zap, Calculator, MessageCircle, Shield, TrendingUp, Clock } from "lucide-react";

const cards = [
  {
    icon: Zap,
    title: "Invoice in 30 Seconds",
    desc: "Add your business once, create invoices instantly. Add items, preview live, and send — faster than any other tool.",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    stat: "30 sec",
    statLabel: "avg. time",
  },
  {
    icon: Calculator,
    title: "Auto GST Calculation",
    desc: "CGST, SGST, and IGST calculated automatically based on your state. No manual math, no errors — just accurate tax.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    stat: "100%",
    statLabel: "accurate",
  },
  {
    icon: MessageCircle,
    title: "Share via WhatsApp",
    desc: "Send professional PDF invoices directly to customers on WhatsApp or Email. They get it instantly, you get paid faster.",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    stat: "1 tap",
    statLabel: "to share",
  },
];

const WhyBillKar = () => (
  <section className="bg-white py-24">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 block">Why BillKar</span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 max-w-2xl mx-auto tracking-tight">
          Everything you need to bill your
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent"> customers and get paid</span>
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white border border-gray-100 rounded-2xl p-7 transition-all"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className={`w-12 h-12 rounded-2xl ${c.iconBg} flex items-center justify-center`}>
                <c.icon size={22} className={c.iconColor} />
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-gray-900">{c.stat}</p>
                <p className="text-xs text-gray-400">{c.statLabel}</p>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{c.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyBillKar;