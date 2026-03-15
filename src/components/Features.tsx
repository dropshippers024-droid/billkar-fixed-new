import { motion } from "framer-motion";
import { LayoutTemplate, CreditCard, FileText, Receipt, Bell, Building2, Calculator, MessageCircle } from "lucide-react";

const features = [
  { icon: Calculator, title: "Auto GST Calculation", desc: "CGST, SGST, IGST auto-calculated based on state.", badge: "Free" as const },
  { icon: LayoutTemplate, title: "3 Invoice Templates", desc: "3 professional templates included free. 8 on Pro.", badge: "Free" as const },
  { icon: MessageCircle, title: "WhatsApp Sharing", desc: "Send invoices directly to customers via WhatsApp.", badge: "Free" as const },
  { icon: CreditCard, title: "Payment Tracking", desc: "Track paid, pending, and overdue invoices.", badge: "Free" as const },
  { icon: FileText, title: "GSTR-1 Export", desc: "Export GST data in portal-ready format.", badge: "Pro" as const },
  { icon: Receipt, title: "Expense Tracking", desc: "Record expenses, upload receipts, track spending.", badge: "Free" as const },
  { icon: Bell, title: "Payment Reminders", desc: "Auto-remind customers before due dates.", badge: "Pro" as const },
  { icon: Building2, title: "Multi-Business", desc: "Manage up to 5 businesses from one account.", badge: "Business" as const },
];

const Features = () => (
  <section id="features" className="bg-gray-50 py-24">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Packed with features you'll actually use
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Everything is free to start. Upgrade to Pro when your business grows.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <f.icon size={20} className="text-indigo-600" />
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                f.badge === "Free" ? "bg-emerald-50 text-emerald-600" :
                f.badge === "Pro" ? "bg-indigo-50 text-indigo-600" :
                "bg-amber-50 text-amber-700"
              }`}>{f.badge}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
