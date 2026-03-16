import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";

type ChartPoint = { name: string; revenue: number };

const periods = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

async function fetchRevenueData(days: number): Promise<ChartPoint[]> {
  const since = subDays(new Date(), days).toISOString().split("T")[0];
  const { invoices: allInvoices } = await api.getInvoices();
  const invoices = allInvoices.filter(
    (inv) => inv.invoice_date >= since && inv.status !== "cancelled"
  );
  if (invoices.length === 0) return [];

  if (days === 7) {
    const map = new Map<string, number>();
    for (let i = 6; i >= 0; i--) { map.set(format(subDays(new Date(), i), "EEE"), 0); }
    for (const inv of invoices) {
      const d = format(new Date(inv.invoice_date), "EEE");
      if (map.has(d)) map.set(d, (map.get(d) || 0) + (Number(inv.total_amount) || 0));
    }
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }));
  } else if (days === 30) {
    const map = new Map<string, number>();
    for (let i = 3; i >= 0; i--) { map.set(`W${4 - i}`, 0); }
    for (const inv of invoices) {
      const wStart = startOfWeek(new Date(inv.invoice_date), { weekStartsOn: 1 });
      const daysAgo = Math.floor((Date.now() - wStart.getTime()) / (7 * 24 * 3600 * 1000));
      const key = `W${4 - Math.min(daysAgo, 3)}`;
      if (map.has(key)) map.set(key, (map.get(key) || 0) + (Number(inv.total_amount) || 0));
    }
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }));
  } else {
    const map = new Map<string, number>();
    for (let i = 2; i >= 0; i--) {
      const d = startOfMonth(subDays(new Date(), i * 30));
      map.set(format(d, "MMM"), 0);
    }
    for (const inv of invoices) {
      const key = format(new Date(inv.invoice_date), "MMM");
      if (map.has(key)) map.set(key, (map.get(key) || 0) + (Number(inv.total_amount) || 0));
    }
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }));
  }
}

const RevenueChart = () => {
  const [active, setActive] = useState(0);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRevenueData(periods[active].days)
      .then(setChartData)
      .finally(() => setLoading(false));
  }, [active]);

  const isEmpty = !loading && chartData.every((d) => d.revenue === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="border border-border p-5"
      style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderRadius: "16px" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-base">Revenue</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your earnings over time</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {periods.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActive(i)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                active === i
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="h-full w-full bg-muted rounded-xl animate-pulse" />
        </div>
      ) : isEmpty ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-2">
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-sm font-medium">No revenue data yet</p>
          <p className="text-xs">Create invoices to see your chart</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={40} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: "#6366f1", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: "#6366f1" }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

export default RevenueChart;