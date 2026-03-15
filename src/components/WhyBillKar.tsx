import { motion } from "framer-motion";
import { Zap, Calculator, MessageCircle } from "lucide-react";

const cards = [
  {
    icon: Zap,
    title: "Invoice in 30 Seconds",
    desc: "Add your business once, then create invoices in seconds. Add items, preview live, and send — faster than any other tool.",
  },
  {
    icon: Calculator,
    title: "Auto GST Calculation",
    desc: "CGST, SGST, and IGST calculated automatically based on your state. No manual math, no errors — just accurate tax every time.",
  },
  {
    icon: MessageCircle,
    title: "Share via WhatsApp & Email",
    desc: "Send professional PDF invoices directly to customers on WhatsApp or Email. They get it instantly, you get paid faster.",
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
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">
          WHY BILLKAR
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 max-w-2xl mx-auto">
          Everything you need to bill your customers and get paid
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
            className="bg-white border border-gray-200 rounded-xl p-7 hover:shadow-md hover:border-indigo-100 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-5">
              <c.icon size={24} className="text-indigo-600" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{c.title}</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyBillKar;
