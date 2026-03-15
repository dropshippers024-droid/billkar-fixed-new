import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  status: string;
}

const statusStyles: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700",
  sent:    "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
  draft:   "bg-secondary text-muted-foreground",
  partial: "bg-amber-100 text-amber-700",
};

const statusLabel: Record<string, string> = {
  paid:    "Paid",
  sent:    "Pending",
  overdue: "Overdue",
  draft:   "Draft",
  partial: "Partial",
};

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-border animate-pulse">
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-32 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-16 bg-muted rounded ml-auto" />
    <div className="h-5 w-14 bg-muted rounded-full" />
  </div>
);

const RecentInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { invoices } = await api.getInvoices();
        const sorted = [...invoices]
          .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
          .slice(0, 5);

        setInvoices(sorted.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number || "—",
          customerName: inv.customer_name || "—",
          date: inv.invoice_date,
          amount: Number(inv.total_amount) || 0,
          status: inv.status || "draft",
        })));
      } catch (err) {
        console.error("Failed to fetch recent invoices:", err);
      }
      setLoading(false);
    };
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-background rounded-2xl border border-border shadow-sm"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold">Recent Invoices</h3>
          <Link to="/dashboard/invoices" className="text-xs text-accent hover:underline font-medium">View All →</Link>
        </div>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </motion.div>
    );
  }

  if (invoices.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-background rounded-2xl border border-border shadow-sm"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold">Recent Invoices</h3>
        </div>
        <div className="p-12 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-bold mb-1">No invoices yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first invoice to get started.</p>
          <Link
            to="/dashboard/invoices/new"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Create your first one →
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-background rounded-2xl border border-border shadow-sm"
    >
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-bold">Recent Invoices</h3>
        <Link to="/dashboard/invoices" className="text-xs text-accent hover:underline font-medium">
          View All →
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-5 font-medium">Invoice #</th>
              <th className="text-left py-3 px-5 font-medium">Customer</th>
              <th className="text-left py-3 px-5 font-medium">Date</th>
              <th className="text-right py-3 px-5 font-medium">Amount</th>
              <th className="text-center py-3 px-5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                <td className="py-3 px-5 font-medium">{inv.invoiceNumber}</td>
                <td className="py-3 px-5">{inv.customerName}</td>
                <td className="py-3 px-5 text-muted-foreground">
                  {inv.date ? format(new Date(inv.date), "dd MMM yyyy") : "—"}
                </td>
                <td className="py-3 px-5 text-right font-semibold">{fmt(inv.amount)}</td>
                <td className="py-3 px-5 text-center">
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusStyles[inv.status] || statusStyles.draft)}>
                    {statusLabel[inv.status] || inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-border">
        {invoices.map((inv) => (
          <div key={inv.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{inv.customerName}</p>
              <p className="text-xs text-muted-foreground">{inv.invoiceNumber} · {inv.date ? format(new Date(inv.date), "dd MMM") : "—"}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{fmt(inv.amount)}</p>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyles[inv.status] || statusStyles.draft)}>
                {statusLabel[inv.status] || inv.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentInvoices;
