import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { initTrial, getTrialStart } from "@/lib/planStore";
import { toast } from "sonner";
import { api } from "@/lib/api";

const plans = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    badge: "Free Forever",
    badgeColor: "bg-emerald-600 text-white",
    checkColor: "text-emerald-500",
    features: [
      "50 invoices/month",
      "3 templates",
      "PDF download",
      "WhatsApp + Email sharing",
      "Expense tracking",
      "No watermark",
      "1 user",
      "Email support",
    ],
  },
  {
    name: "Pro",
    monthly: 399,
    annual: 299,
    badge: "Most Popular",
    badgeColor: "bg-indigo-600 text-white",
    elevated: true,
    checkColor: "text-indigo-600",
    features: [
      "Unlimited invoices",
      "8 premium templates",
      "UPI QR on invoices",
      "Payment reminders",
      "Recurring invoices",
      "GSTR-1 export",
      "3 team members",
      "Priority support",
    ],
  },
  {
    name: "Business",
    monthly: 799,
    annual: 599,
    badge: "Best for Teams",
    badgeColor: "bg-gray-800 text-white",
    checkColor: "text-indigo-600",
    features: [
      "Everything in Pro",
      "10 team members",
      "Excel + PDF report exports",
      "Multi-business (up to 5)",
      "Priority WhatsApp support",
      "Custom domain (coming soon)",
    ],
  },
];

const faqs = [
  { q: "Is BillKar really free?", a: "Yes. Create up to 50 invoices per month, forever. No credit card needed." },
  { q: "Do I need a GST number?", a: "No. BillKar works with or without GSTIN. Add it when you're ready." },
  { q: "Can I use it on mobile?", a: "Yes. BillKar works on any device with a browser \u2014 phone, tablet, or desktop." },
  { q: "How is it different from Tally?", a: "Tally is desktop accounting software. BillKar is cloud-based GST invoicing \u2014 simpler, faster, accessible anywhere." },
  { q: "Can I migrate from Vyapar?", a: "Yes. Import your customers and products via CSV. Your data moves in minutes." },
  { q: "Is my data safe?", a: "Absolutely. Your data is encrypted and stored on Cloudflare's global network with 99.9% uptime." },
];

const AnimatedPrice = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>(0);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    prevRef.current = value;
    const diff = value - start;
    if (diff === 0) return;
    cancelAnimationFrame(rafRef.current);
    const duration = 300;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display === 0 ? "0" : display.toLocaleString("en-IN")}</>;
};

const Pricing = () => {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleProTrial = () => {
    if (!api.isLoggedIn()) { navigate("/signup"); return; }
    if (getTrialStart()) { navigate("/dashboard"); return; }
    initTrial();
    toast.success("Pro trial activated! You have 7 days of unlimited access.");
    navigate("/dashboard");
  };

  const handleClick = (plan: typeof plans[0]) => {
    if (plan.monthly === 0) { navigate("/signup"); return; }
    handleProTrial();
  };

  return (
    <section id="pricing" className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">PRICING</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-500 mb-8">Start free. Upgrade when you need. All prices inclusive of GST.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3">
            <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${!annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                Annual
              </button>
            </div>
            {annual && (
              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
                Save 25%
              </span>
            )}
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly;
            const isPaid = plan.monthly > 0;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-xl border p-8 ${
                  "elevated" in plan && plan.elevated
                    ? "border-indigo-200 shadow-md"
                    : "border-gray-200 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {price === 0 ? "₹0" : <>₹<AnimatedPrice value={price} /></>}
                    </span>
                    {isPaid && <span className="text-gray-400 text-sm">/mo</span>}
                  </div>
                  {!isPaid && (
                    <p className="text-xs text-gray-500 mt-1">Free for up to 50 invoices/month</p>
                  )}
                  {isPaid && annual && (
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="line-through">₹{plan.monthly}/mo</span>{" "}billed annually
                    </p>
                  )}
                  {isPaid && !annual && (
                    <p className="text-xs text-gray-400 mt-1">or ₹{plan.annual}/mo billed annually</p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={14} className={plan.checkColor} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleClick(plan)}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                    isPaid
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isPaid ? "Start 7-Day Trial \u2192" : "Start Free \u2192"}
                </button>

                {isPaid && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    7-day free trial · No credit card needed
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-20"
        >
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  {faq.q}
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
