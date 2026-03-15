import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const steps = [
  { num: 1, title: "Add Your Business", desc: "Enter your business name, GSTIN, and bank details. Takes under a minute." },
  { num: 2, title: "Create an Invoice", desc: "Add items, set quantities and rates. GST calculates automatically." },
  { num: 3, title: "Share & Get Paid", desc: "Send via WhatsApp or Email. Track payments and send reminders." },
];

const HowItWorks = () => (
  <section className="bg-white py-24">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl font-bold text-gray-900">
          Up and running in 3 steps
        </h2>
      </motion.div>

      <div className="relative max-w-4xl mx-auto">
        {/* Connecting line — desktop only */}
        <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-px border-t-2 border-dashed border-gray-200" />

        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4 relative z-10">
                {s.num}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mt-10"
      >
        <Link
          to="/signup"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Get started in 30 seconds →
        </Link>
      </motion.div>
    </div>
  </section>
);

export default HowItWorks;
