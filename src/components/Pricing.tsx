import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Zap } from "lucide-react";
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
    badgeColor: "bg-emerald-100 text-emerald-700",
    cardBg: "bg-white",
    btnClass: "bg-gray-900 text-white hover:bg-gray-800",
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
    cardBg: "bg-gradient-to-b from-indigo-600 to-indigo-700",
    btnClass: "bg-white text-indigo-600 hover:bg-indigo-50",
    checkColor: "text-indigo-200",
    textColor: "text-white",
    subTextColor: "text-indigo-200",
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
    cardBg: "bg-white",
    btnClass: "bg-gray-900 text-white hover:bg-gray-800",
    checkColor: "text-indigo-500",
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
  { q: "Can I use it on mobile?", a: "Yes. BillKar works on any device with a browser — phone, tablet, or desktop." },
  { q: "How is it different from Tally?", a: "Tally is desktop accounting software. BillKar is cloud-based GST invoicing — simpler, faster, accessible anywhere." },
  { q: "Can I migrate from other tools?", a: "Yes. Import your customers and products via CSV. Your data moves in minutes." },
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
    <section id="pricing" className="bg-white py-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 block">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 mb-8 text-lg">Start free. Upgrade when you need. All prices inclusive of GST.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3">
            <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                Annual
              </button>
            </div>
            {annual && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                <Zap size={10} /> Save 25%
              </span>
            )}
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly;
            const isPaid = plan.monthly > 0;
            const isElevated = "elevated" in plan && plan.elevated;
            const textColor = "textColor" in plan ? plan.textColor : "text-gray-900";
            const subTextColor = "subTextColor" in plan ? plan.subTextColor : "text-gray-500";

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 ${plan.cardBg} ${isElevated ? "md:-mt-4 md:mb-4" : ""}`}
                style={{
                  boxShadow: isElevated
                    ? "0 20px 60px rgba(99,102,241,0.35)"
                    : "0 2px 12px rgba(0,0,0,0.06)",
                  border: isElevated ? "none" : "1px solid #f1f5f9",
                }}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.badgeColor}`}>
                    {plan.badge}
                  </div>
                )}

                <h3 className={`text-lg font-bold mb-1 ${textColor}`}>{plan.name}</h3>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold ${textColor}`}>
                      {price === 0 ? "₹0" : <>₹<AnimatedPrice value={price} /></>}
                    </span>
                    {isPaid && <span className={`text-sm ${subTextColor}`}>/mo</span>}
                  </div>
                  {!isPaid && <p className={`text-xs mt-1 ${subTextColor}`}>Free for up to 50 invoices/month</p>}
                  {isPaid && annual && (
                    <p className={`text-xs mt-1 ${subTextColor}`}>
                      <span className="line-through">₹{plan.monthly}/mo</span> · billed annually
                    </p>
                  )}
                  {isPaid && !annual && (
                    <p className={`text-xs mt-1 ${subTextColor}`}>or ₹{plan.annual}/mo billed annually</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${isElevated ? "text-indigo-100" : "text-gray-600"}`}>
                      <Check size={15} className={plan.checkColor} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleClick(plan)}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${plan.btnClass}`}
                  style={isElevated ? { boxShadow: "0 4px 14px rgba(0,0,0,0.15)" } : {}}
                >
                  {isPaid ? "Start 7-Day Trial →" : "Start Free →"}
                </button>

                {isPaid && (
                  <p className={`text-xs text-center mt-2.5 ${subTextColor}`}>
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
          className="max-w-3xl mx-auto mt-24"
        >
          <h3 className="text-2xl font-extrabold text-gray-900 text-center mb-10">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  {faq.q}
                  <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
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
                      <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
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