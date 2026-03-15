import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const rows = [
  { feature: "Free invoices/month", billkar: "50", zoho: "5", vyapar: "0", swipe: "15" },
  { feature: "Auto GST calc", billkar: true, zoho: true, vyapar: true, swipe: true },
  { feature: "Free templates", billkar: "3", zoho: "3", vyapar: "5", swipe: "4" },
  { feature: "Total templates (paid)", billkar: "8", zoho: "3", vyapar: "5", swipe: "4" },
  { feature: "WhatsApp sharing", billkar: true, zoho: false, vyapar: false, swipe: true },
  { feature: "No watermark", billkar: true, zoho: false, vyapar: false, swipe: false },
  { feature: "GSTR-1 export", billkar: "Paid", zoho: "Paid", vyapar: "Paid", swipe: "Paid" },
  { feature: "Expense tracking", billkar: true, zoho: "Paid", vyapar: false, swipe: false },
  { feature: "Multi-business", billkar: "Paid", zoho: "Paid", vyapar: false, swipe: false },
  { feature: "Starting price", billkar: "Free", zoho: "₹1,250/mo", vyapar: "₹899/yr", swipe: "₹299/mo" },
];

const Cell = ({ value, isPrice }: { value: string | boolean; isPrice?: boolean }) => {
  if (value === true) return <Check size={16} className="text-emerald-600 font-bold mx-auto" strokeWidth={3} />;
  if (value === false) return <X size={16} className="text-gray-300 mx-auto" strokeWidth={2.5} />;
  if (isPrice && value === "Free") return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">FREE</span>;
  return <span>{value}</span>;
};

const ComparisonTable = () => (
  <section id="compare" className="bg-gray-50 py-20">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">COMPARE</p>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">See how BillKar compares</h2>
        <p className="text-gray-500">More features, better pricing, built for India.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto overflow-x-auto"
      >
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-5 font-semibold text-gray-500 w-[30%]">Feature</th>
                <th className="py-4 px-4 text-center bg-indigo-50">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-extrabold text-gray-900">Bill<span className="text-gradient-primary">Kar</span></span>
                    <span className="inline-flex items-center bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">STARTS FREE</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center">
                  <span className="text-sm font-bold text-gray-500">Zoho Invoice</span>
                </th>
                <th className="py-4 px-4 text-center">
                  <span className="text-sm font-bold text-gray-500">Vyapar</span>
                </th>
                <th className="py-4 px-4 text-center">
                  <span className="text-sm font-bold text-gray-500">Swipe</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isPrice = row.feature === "Starting price";
                return (
                  <tr key={row.feature} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <td className="py-3.5 px-5 font-medium text-gray-700">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center bg-indigo-50/60 font-semibold text-gray-900"><Cell value={row.billkar} isPrice={isPrice} /></td>
                    <td className="py-3.5 px-4 text-center text-gray-500"><Cell value={row.zoho} /></td>
                    <td className="py-3.5 px-4 text-center text-gray-500"><Cell value={row.vyapar} /></td>
                    <td className="py-3.5 px-4 text-center text-gray-500"><Cell value={row.swipe} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  </section>
);

export default ComparisonTable;
