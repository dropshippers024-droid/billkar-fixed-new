import { getCurrentPlan, isTrialActive, isPro } from "@/lib/planStore";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { IndianRupee, TrendingUp, Receipt, Wallet, FileDown, FileSpreadsheet, Lock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api";
import UpgradeModal from "@/components/UpgradeModal";
import { getCurrentPlan } from "@/lib/planStore";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => "₹" + r2(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const periods = ["This Month", "Last Month", "Quarter", "Year"];

function getPeriodRange(p: string): { start: string; end: string } {
  const now = new Date();
  switch (p) {
    case "Last Month": {
      const last = subMonths(now, 1);
      return { start: format(startOfMonth(last), "yyyy-MM-dd"), end: format(endOfMonth(last), "yyyy-MM-dd") };
    }
    case "Quarter":
      return { start: format(startOfQuarter(now), "yyyy-MM-dd"), end: format(endOfQuarter(now), "yyyy-MM-dd") };
    case "Year":
      return { start: format(startOfYear(now), "yyyy-MM-dd"), end: format(endOfYear(now), "yyyy-MM-dd") };
    default:
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
  }
}

interface ChartPoint { name: string; revenue: number }
interface CustomerRow { name: string; invoices: number; revenue: number }
interface ProductRow  { name: string; qty: number; revenue: number }
interface SalesData {
  totalSales: number;
  taxCollected: number;
  expenses: number;
  netRevenue: number;
  chart: ChartPoint[];
  topCustomers: CustomerRow[];
  topProducts: ProductRow[];
}

type ReportInvoice = {
  id: string;
  customer_name?: string;
  invoice_date?: string;
  status?: string;
  total_amount?: number | string;
};

type ReportExpense = {
  amount?: number | string;
  date?: string;
};

type ReportItem = {
  description?: string;
  name?: string;
  quantity?: number | string;
  rate?: number | string;
  taxable_amount?: number | string;
  gst_percent?: number | string;
};

const SkeletonTableRow = ({ cols }: { cols: number }) => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-border animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-4 w-20 bg-muted rounded" />
    ))}
  </div>
);

const SalesReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("This Month");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [data, setData] = useState<SalesData>({
    totalSales: 0, taxCollected: 0, expenses: 0, netRevenue: 0,
    chart: [], topCustomers: [], topProducts: [],
  });

  const isFree = getCurrentPlan() === "free";

  const fetchData = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    try {
      if (!api.isLoggedIn()) { setLoading(false); return; }

      const { start, end } = getPeriodRange(selectedPeriod);

      // Fetch all invoices and filter client-side by date range and status
      const { invoices: rawInvoices } = await api.getInvoices();
      const invoices = ((rawInvoices || []) as ReportInvoice[]).filter((inv) =>
        inv.invoice_date >= start &&
        inv.invoice_date <= end &&
        !["cancelled", "draft"].includes(String(inv.status || "").toLowerCase())
      );

      // Fetch all expenses and filter client-side by date range
      const { expenses: rawExpenses } = await api.getExpenses();
      const expenseData = ((rawExpenses || []) as ReportExpense[]).filter((e) =>
        e.date >= start && e.date <= end
      );

      // Fetch items for each invoice
      const invoiceIds = invoices.map((invoice) => invoice.id);
      const itemResults = invoiceIds.length > 0
        ? await Promise.all(invoices.map((invoice) => api.getInvoiceItems(invoice.id).catch(() => [])))
        : [];
      const itemData = itemResults.flat() as ReportItem[];

      const totalSales = invoices.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0);
      const expenses   = expenseData.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

      // Tax from items: use stored taxable amounts when available to match invoice totals more closely.
      let taxCollected = 0;
      for (const item of itemData) {
        const taxable = Number(item.taxable_amount) || (Number(item.quantity) || 0) * (Number(item.rate) || 0);
        const gst = Number(item.gst_percent) || 0;
        taxCollected += taxable * (gst / 100);
      }

      const netRevenue = totalSales - taxCollected - expenses;

      // Monthly chart (last 6 months)
      const chart: ChartPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const mStart = format(startOfMonth(d), "yyyy-MM-dd");
        const mEnd   = format(endOfMonth(d), "yyyy-MM-dd");
        const rev = invoices
          .filter((invoice) => invoice.invoice_date >= mStart && invoice.invoice_date <= mEnd)
          .reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0);
        chart.push({ name: format(d, "MMM"), revenue: rev });
      }

      // Top customers
      const custMap = new Map<string, { invoices: number; revenue: number }>();
      for (const inv of invoices) {
        const name = inv.customer_name || "Unknown";
        const ex = custMap.get(name) || { invoices: 0, revenue: 0 };
        custMap.set(name, { invoices: ex.invoices + 1, revenue: ex.revenue + (Number(inv.total_amount) || 0) });
      }
      const topCustomers = Array.from(custMap.entries())
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Top products
      const prodMap = new Map<string, { qty: number; revenue: number }>();
      for (const item of itemData) {
        const name = item.name || item.description || "Unknown";
        const ex = prodMap.get(name) || { qty: 0, revenue: 0 };
        const qty = Number(item.quantity) || 0;
        const revenue = Number(item.taxable_amount) || qty * (Number(item.rate) || 0);
        prodMap.set(name, { qty: ex.qty + qty, revenue: ex.revenue + revenue });
      }
      const topProducts = Array.from(prodMap.entries())
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      setData({ totalSales, taxCollected, expenses, netRevenue, chart, topCustomers, topProducts });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const handleExportExcel = () => {
    if (isFree) { setUpgradeOpen(true); return; }
    const fmtNum = (n: number) => r2(n).toFixed(2);
    const rows: (string | number)[][] = [
      ["Sales Report - " + period],
      [],
      ["Summary"],
      ["Total Sales", fmtNum(data.totalSales)],
      ["Tax Collected", fmtNum(data.taxCollected)],
      ["Expenses", fmtNum(data.expenses)],
      ["Net Revenue", fmtNum(data.netRevenue)],
      [],
      ["Top Customers"],
      ["#", "Customer", "Invoices", "Revenue (INR)"],
      ...data.topCustomers.map((c, i) => [i + 1, c.name, c.invoices, fmtNum(c.revenue)]),
      [],
      ["Top Products"],
      ["#", "Product", "Qty Sold", "Revenue (INR)"],
      ...data.topProducts.map((p, i) => [i + 1, p.name, p.qty, fmtNum(p.revenue)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SalesReport_${period.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (isFree) { setUpgradeOpen(true); return; }
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, margin = 14, colR = W - margin;
      const indigo: [number, number, number] = [79, 70, 229];
      const gray: [number, number, number] = [241, 245, 249];
      const dark: [number, number, number] = [30, 41, 59];

      // Indigo header bar
      doc.setFillColor(...indigo);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold").setFontSize(16);
      doc.text("Sales Report", margin, 13);
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.text(period, margin, 21);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, colR, 21, { align: "right" });

      let y = 38;
      doc.setTextColor(...dark);

      // Summary box
      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text("Summary", margin, y); y += 5;
      const summaryItems = [
        ["Total Sales", fmt(data.totalSales)],
        ["Tax Collected", fmt(data.taxCollected)],
        ["Expenses", fmt(data.expenses)],
        ["Net Revenue", fmt(data.netRevenue)],
      ];
      summaryItems.forEach(([label, val], i) => {
        const rowY = y + i * 8;
        if (i % 2 === 0) {
          doc.setFillColor(...gray);
          doc.rect(margin, rowY - 4, colR - margin, 8, "F");
        }
        doc.setFont("helvetica", "normal").setFontSize(10);
        doc.text(label, margin + 2, rowY);
        doc.setFont("helvetica", "bold");
        doc.text(val, colR, rowY, { align: "right" });
      });
      y += summaryItems.length * 8 + 8;

      // Helper: draw table
      const drawTable = (title: string, headers: string[], colXs: number[], aligns: Array<"left"|"right">, rows: string[][]) => {
        doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...dark);
        doc.text(title, margin, y); y += 5;
        // Gray header row
        doc.setFillColor(...gray);
        doc.rect(margin, y - 4, colR - margin, 7, "F");
        doc.setFont("helvetica", "bold").setFontSize(9);
        headers.forEach((h, i) => {
          if (aligns[i] === "right") {
            doc.text(h, colXs[i], y, { align: "right" });
          } else {
            doc.text(h, colXs[i], y);
          }
        });
        y += 4;
        doc.setLineWidth(0.1); doc.setDrawColor(200, 200, 210); doc.line(margin, y, colR, y); y += 3;
        if (rows.length === 0) {
          doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(120, 120, 130);
          doc.text("No data for this period.", margin + 2, y); y += 6;
        } else {
          doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...dark);
          rows.forEach((row, ri) => {
            if (ri % 2 === 0) { doc.setFillColor(252, 252, 255); doc.rect(margin, y - 4, colR - margin, 7, "F"); }
            row.forEach((cell, ci) => {
              if (aligns[ci] === "right") {
                doc.text(cell, colXs[ci], y, { align: "right" });
              } else {
                doc.text(cell, colXs[ci], y);
              }
            });
            y += 7;
          });
        }
        y += 6;
      };

      // Top Customers table
      drawTable(
        "Top Customers by Revenue",
        ["#", "Customer", "Invoices", "Revenue"],
        [margin + 2, margin + 12, 140, colR],
        ["left", "left", "right", "right"],
        data.topCustomers.map((c, i) => [String(i + 1), c.name.slice(0, 38), String(c.invoices), fmt(c.revenue)])
      );

      // Top Products table
      drawTable(
        "Top Products by Quantity",
        ["#", "Product", "Qty Sold", "Revenue"],
        [margin + 2, margin + 12, 140, colR],
        ["left", "left", "right", "right"],
        data.topProducts.map((p, i) => [String(i + 1), p.name.slice(0, 38), String(p.qty), fmt(p.revenue)])
      );

      // Footer
      const pageH = 297;
      doc.setFillColor(...indigo);
      doc.rect(0, pageH - 12, W, 12, "F");
      doc.setTextColor(255, 255, 255).setFont("helvetica", "normal").setFontSize(8);
      doc.text("Generated by BillKar  |  billkar.co.in", W / 2, pageH - 4.5, { align: "center" });

      doc.save(`SalesReport_${period.replace(/\s+/g, "_")}.pdf`);
    });
  };

  const statCards = [
    { label: "Total Sales",   value: data.totalSales,   icon: IndianRupee, color: "text-primary",     bg: "bg-primary/10"  },
    { label: "Tax Collected", value: data.taxCollected, icon: Receipt,     color: "text-accent",      bg: "bg-accent/10"   },
    { label: "Expenses",      value: data.expenses,     icon: Wallet,      color: "text-amber-600",   bg: "bg-amber-100"   },
    { label: "Net Revenue",   value: data.netRevenue,   icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <DashboardShell>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="export" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-extrabold">Sales Report</h1>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              {isFree ? <Lock size={15} /> : <FileSpreadsheet size={15} />} Export Excel
            </button>
            <button onClick={handleExportPDF} className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              {isFree ? <Lock size={15} /> : <FileDown size={15} />} Export PDF
            </button>
          </div>
        </div>

        {/* Period pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {periods.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                period === p ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:bg-secondary")}>
              {p}
            </button>
          ))}
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-full h-24 rounded-2xl bg-muted animate-pulse" />)}
            </div>
            <div className="w-full h-64 rounded-2xl bg-muted animate-pulse" />
            <div className="grid lg:grid-cols-2 gap-6">
              {[4, 4].map((cols, ti) => (
                <div key={ti} className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border"><div className="h-4 w-40 bg-muted rounded animate-pulse" /></div>
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={cols} />)}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-background rounded-2xl border border-border shadow-sm p-5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                    <s.icon size={20} className={s.color} />
                  </div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-extrabold mt-1">{fmt(Math.max(0, s.value))}</p>
                </motion.div>
              ))}
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm p-5">
              <h3 className="font-bold text-sm mb-4">Revenue Trend (Last 6 Months)</h3>
              {data.chart.every((p) => p.revenue === 0) ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No revenue data to display.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.chart}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(213,56%,24%)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(213,56%,24%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(214,32%,91%)", fontSize: 12 }} formatter={(v: number) => [fmt(v), "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(213,56%,24%)" strokeWidth={2} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-background rounded-2xl border border-border shadow-sm">
                <div className="p-5 border-b border-border"><h3 className="font-bold text-sm">Top Customers by Revenue</h3></div>
                {data.topCustomers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No customer data for this period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2.5 px-5 font-medium">#</th>
                        <th className="text-left py-2.5 px-4 font-medium">Customer</th>
                        <th className="text-center py-2.5 px-4 font-medium">Invoices</th>
                        <th className="text-right py-2.5 px-5 font-medium">Revenue</th>
                      </tr></thead>
                      <tbody>
                        {data.topCustomers.map((c, i) => (
                          <tr key={c.name} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                            <td className="py-2.5 px-5 text-muted-foreground">{i + 1}</td>
                            <td className="py-2.5 px-4 font-medium">{c.name}</td>
                            <td className="py-2.5 px-4 text-center text-muted-foreground">{c.invoices}</td>
                            <td className="py-2.5 px-5 text-right font-semibold">{fmt(c.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-background rounded-2xl border border-border shadow-sm">
                <div className="p-5 border-b border-border"><h3 className="font-bold text-sm">Top Products by Quantity</h3></div>
                {data.topProducts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No product data for this period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2.5 px-5 font-medium">#</th>
                        <th className="text-left py-2.5 px-4 font-medium">Product</th>
                        <th className="text-center py-2.5 px-4 font-medium">Qty Sold</th>
                        <th className="text-right py-2.5 px-5 font-medium">Revenue</th>
                      </tr></thead>
                      <tbody>
                        {data.topProducts.map((p, i) => (
                          <tr key={p.name} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                            <td className="py-2.5 px-5 text-muted-foreground">{i + 1}</td>
                            <td className="py-2.5 px-4 font-medium">{p.name}</td>
                            <td className="py-2.5 px-4 text-center text-muted-foreground">{p.qty}</td>
                            <td className="py-2.5 px-5 text-right font-semibold">{fmt(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </DashboardShell>
  );
};

export default SalesReport;
