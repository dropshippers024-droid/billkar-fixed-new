import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

// Only rows where BillKar wins or ties
// Removed: "Free templates" (Vyapar has 5, we have 3 — we lose)
// Removed: "Total templates paid" (irrelevant)
// Real 2026 prices: Zoho ₹749/mo, Vyapar ₹1,499/yr, Swipe ₹499/mo

const rows = [
  { feature: "Free invoices/month",      billkar: "Unlimited ∞", zoho: "5",       vyapar: "0",          swipe: "15",      win: true  },
  { feature: "No watermark (free)",      billkar: true,          zoho: false,     vyapar: false,        swipe: false,     win: true  },
  { feature: "UPI QR on invoice (free)", billkar: true,          zoho: false,     vyapar: false,        swipe: false,     win: true  },
  { feature: "Auto GST calculation",     billkar: true,          zoho: true,      vyapar: true,         swipe: true,      win: false },
  { feature: "WhatsApp sharing",         billkar: true,          zoho: false,     vyapar: false,        swipe: true,      win: false },
  { feature: "Expense tracking (free)",  billkar: true,          zoho: false,     vyapar: false,        swipe: false,     win: true  },
  { feature: "Cloud-based",             billkar: true,          zoho: true,      vyapar: false,        swipe: true,      win: false },
  { feature: "Works on mobile browser", billkar: true,          zoho: true,      vyapar: false,        swipe: true,      win: false },
  { feature: "GSTR-1 export",           billkar: "₹299/mo",     zoho: "₹749/mo", vyapar: "₹1,499/yr",  swipe: "₹499/mo", win: true  },
  { feature: "Payment reminders",       billkar: "₹299/mo",     zoho: "₹749/mo", vyapar: "₹1,499/yr",  swipe: "₹499/mo", win: true  },
  { feature: "Starting price",          billkar: "FREE",        zoho: "₹749/mo", vyapar: "₹1,499/yr",  swipe: "₹499/mo", win: true  },
];

type Val = string | boolean;

const BillkarCell = ({ value }: { value: Val }) => {
  if (value === true) return (
    <div className="flex justify-center">
      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
        <Check size={14} className="text-emerald-600" strokeWidth={3} />
      </div>
    </div>
  );
  if (value === "FREE") return (
    <span className="inline-flex items-center bg-emerald-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
      FREE 🎉
    </span>
  );
  if (value === "Unlimited ∞") return (
    <span className="inline-flex items-center bg-indigo-600 text-white text-xs font-extrabold px-3 py-1 rounded-full">
      Unlimited ∞
    </span>
  );
  if (typeof value === "string" && value.includes("₹")) return (
    <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
      {value} ✓
    </span>
  );
  return <span className="font-bold text-gray-900 text-sm">{value as string}</span>;
};

const OtherCell = ({ value }: { value: Val }) => {
  if (value === true) return (
    <div className="flex justify-center">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
        <Check size={13} className="text-gray-400" strokeWidth={2.5} />
      </div>
    </div>
  );
  if (value === false) return (
    <div className="flex justify-center">
      <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
        <X size={12} className="text-red-300" strokeWidth={2.5} />
      </div>
    </div>
  );
  return <span className="text-sm text-gray-400">{value as string}</span>;
};

const ComparisonTable = () => (
  <section id="compare" className="bg-gray-50 py-24">
    <div className="max-w-6xl mx-auto px-4">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 block">Compare</span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Why businesses choose{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            BillKar
          </span>
        </h2>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          More features free. Cheapest when you upgrade. Built for Indian businesses.
        </p>
      </motion.div>

      {/* Win badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-wrap justify-center gap-3 mb-10"
      >
        {[
          "✦ Unlimited free invoices",
          "✦ UPI QR free",
          "✦ No watermark free",
          "✦ Cheapest Pro ₹299/mo",
          "✦ Free expense tracking",
        ].map((b) => (
          <span key={b} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full">
            {b}
          </span>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto overflow-x-auto"
      >
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden min-w-[600px]"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-5 px-6 font-semibold text-gray-400 text-xs uppercase tracking-wider w-[34%]">
                  Feature
                </th>
                <th className="py-5 px-4 text-center w-[17%]"
                  style={{ background: "linear-gradient(180deg, #eef2ff 0%, #f5f7ff 100%)" }}>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-lg font-extrabold text-gray-900">
                      Bill<span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">Kar</span>
                    </span>
                    <span className="bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Best Value
                    </span>
                  </div>
                </th>
                <th className="py-5 px-4 text-center w-[16%]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-gray-400">Zoho</span>
                    <span className="text-[10px] text-gray-300">₹749/mo</span>
                  </div>
                </th>
                <th className="py-5 px-4 text-center w-[16%]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-gray-400">Vyapar</span>
                    <span className="text-[10px] text-gray-300">₹1,499/yr</span>
                  </div>
                </th>
                <th className="py-5 px-4 text-center w-[16%]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-gray-400">Swipe</span>
                    <span className="text-[10px] text-gray-300">₹499/mo</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature}
                  className={`border-b border-gray-50 last:border-0 transition-colors hover:bg-indigo-50/20 ${
                    row.win ? "bg-indigo-50/10" : i % 2 === 0 ? "bg-white" : "bg-gray-50/10"
                  }`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${row.win ? "text-gray-900" : "text-gray-600"}`}>
                        {row.feature}
                      </span>
                      {row.win && (
                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                          We win
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center"
                    style={{ background: "rgba(238,242,255,0.5)" }}>
                    <BillkarCell value={row.billkar} />
                  </td>
                  <td className="py-4 px-4 text-center"><OtherCell value={row.zoho} /></td>
                  <td className="py-4 px-4 text-center"><OtherCell value={row.vyapar} /></td>
                  <td className="py-4 px-4 text-center"><OtherCell value={row.swipe} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mt-10"
      >
        <Link to="/signup"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
          style={{ boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
          Start Free — No Credit Card Needed →
        </Link>
        <p className="text-xs text-gray-400 mt-3">Join 15,000+ businesses already using BillKar</p>
      </motion.div>

    </div>
  </section>
);

export default ComparisonTable;