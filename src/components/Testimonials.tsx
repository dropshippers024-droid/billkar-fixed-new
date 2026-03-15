import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya S.",
    role: "D2C Founder, Mumbai",
    initials: "PS",
    avatarBg: "bg-indigo-100",
    avatarText: "text-indigo-600",
    quote: "BillKar reduced our invoicing time from 10 minutes to 30 seconds. The WhatsApp sharing is a game-changer for my D2C brand.",
  },
  {
    name: "Rajesh Kumar",
    role: "Chartered Accountant, Delhi",
    initials: "RK",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-600",
    quote: "As a CA managing 50+ clients, the GSTR-1 export saves me hours every month. Best billing tool I've recommended to my clients.",
  },
  {
    name: "Ananya Patel",
    role: "Freelance Designer, Bangalore",
    initials: "AP",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-600",
    quote: "Finally a billing software that understands Indian businesses. Simple, fast, and the free plan is incredibly generous.",
  },
];

const Testimonials = () => (
  <section id="testimonials" className="bg-gray-50 py-20">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-gray-900">Loved by Indian businesses</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-gray-600 italic leading-relaxed mb-5">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${t.avatarBg} flex items-center justify-center ${t.avatarText} text-sm font-bold flex-shrink-0`}>
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
