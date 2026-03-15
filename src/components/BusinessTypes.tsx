import { motion } from "framer-motion";
import { Store, Laptop, ShoppingBag, Calculator } from "lucide-react";

const types = [
  { icon: Store, title: "Retailers & Shopkeepers", desc: "Daily GST billing, inventory tracking, payment reminders for retail shops." },
  { icon: Laptop, title: "Freelancers & Consultants", desc: "Professional invoices for clients, track payments, manage multiple projects." },
  { icon: ShoppingBag, title: "D2C & eCommerce", desc: "Bulk invoicing, multi-channel support, marketplace-ready GST reports." },
  { icon: Calculator, title: "CAs & Tax Professionals", desc: "Manage 50+ client businesses, GSTR-1 export, bulk operations." },
];

const BusinessTypes = () => (
  <section className="bg-white py-20">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-gray-900">Built for every Indian business</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {types.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-50 rounded-xl p-6 border border-transparent hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-300"
          >
            <t.icon size={24} className="text-indigo-600 mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BusinessTypes;
