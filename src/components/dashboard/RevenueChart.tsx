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
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "EEE");
      map.set(d, 0);
    }
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
      className="bg-background rounded-2xl border border-border shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Revenue</h3>
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {periods.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActive(i)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                active === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="h-32 w-full bg-muted rounded-xl animate-pulse" />
        </div>
      ) : isEmpty ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
          <p className="text-sm">No revenue data yet</p>
          <p className="text-xs">Create invoices to see your revenue chart</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(213, 56%, 24%)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(213, 56%, 24%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid hsl(214, 32%, 91%)", fontSize: 12 }}
              formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="hsl(213, 56%, 24%)" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

export default RevenueChart;
