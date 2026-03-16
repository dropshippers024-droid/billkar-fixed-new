import { motion } from "framer-motion";
import { LayoutTemplate, CreditCard, FileText, Receipt, Bell, Building2, Calculator, MessageCircle } from "lucide-react";

const features = [
  { icon: Calculator, title: "Auto GST Calculation", desc: "CGST, SGST, IGST auto-calculated based on customer state. Zero manual errors.", badge: "Free" as const },
  { icon: LayoutTemplate, title: "Premium Templates", desc: "3 professional templates free. 8 stunning designs on Pro.", badge: "Free" as const },
  { icon: MessageCircle, title: "WhatsApp Sharing", desc: "Send invoices directly to customers on WhatsApp in one tap.", badge: "Free" as const },
  { icon: CreditCard, title: "Payment Tracking", desc: "Track paid, pending, and overdue invoices at a glance.", badge: "Free" as const },
  { icon: FileText, title: "GSTR-1 Export", desc: "Export GST data in portal-ready JSON format for easy filing.", badge: "Pro" as const },
  { icon: Receipt, title: "Expense Tracking", desc: "Record expenses, upload receipts, and track business spending.", badge: "Free" as const },
  { icon: Bell, title: "Payment Reminders", desc: "Auto-remind customers before and after due dates via WhatsApp.", badge: "Pro" as const },
  { icon: Building2, title: "Multi-Business", desc: "Manage up to 5 businesses from a single BillKar account.", badge: "Business" as const },
];

const badgeStyles = {
  Free: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  Pro: "bg-indigo-50 text-indigo-600 border border-indigo-100",
  Business: "bg-amber-50 text-amber-700 border border-amber-100",
};

const iconBg = {
  Free: "bg-emerald-50 text-emerald-600",
  Pro: "bg-indigo-50 text-indigo-600",
  Business: "bg-amber-50 text-amber-600",
};

const Features = () => (
  <section id="features" className="bg-white py-24">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 block">Features</span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Everything you need to run
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            your business billing
          </span>
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto text-lg">
          All core features are free. Upgrade to Pro when your business grows.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }}
            className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer transition-all"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[f.badge]}`}>
                <f.icon size={18} />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${badgeStyles[f.badge]}`}>
                {f.badge}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">{f.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;