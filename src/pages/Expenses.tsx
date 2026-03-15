import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Wallet, X, Search, Paperclip, MoreVertical,
  Pencil, Trash2, Download, Image as ImageIcon, FileText,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canWrite } from "@/lib/planStore";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

const CATEGORIES = [
  "Rent", "Utilities", "Travel", "Office Supplies", "Salaries",
  "Marketing", "Raw Materials", "Packaging", "Shipping",
  "Internet/Phone", "Professional Fees", "Other",
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Credit Card", "Cheque"];

const PIE_COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#14B8A6",
  "#6366F1", "#64748B",
];

interface Expense {
  id: string;
  date: string;
  category: string;
  desc: string;
  vendor: string;
  amount: number;
  gst: number;
  paymentMethod: string;
  receiptUrl: string | null;
}

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  category: "Rent",
  desc: "",
  vendor: "",
  amount: "",
  gst: "",
  paymentMethod: "Cash",
};

type FilterTab = "All" | "This Month" | "Last Month" | "Custom";

const Expenses = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("This Month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receipt viewer
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Three-dot menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { expenses: data } = await api.getExpenses();
      if (data) {
        setExpenses(data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          date: (e.date as string) ?? "",
          category: (e.category as string) ?? "Other",
          desc: (e.description as string) ?? "",
          vendor: (e.vendor_name as string) ?? "",
          amount: Number(e.amount) || 0,
          gst: Number(e.gst_amount) || 0,
          paymentMethod: (e.payment_method as string) ?? "Cash",
          receiptUrl: (e.receipt_url as string) ?? null,
        })));
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  // ── Date helpers ───────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastMonthEnd   = format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd");

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = expenses;
    if (tab === "This Month") list = list.filter((e) => e.date >= thisMonthStart && e.date <= thisMonthEnd);
    else if (tab === "Last Month") list = list.filter((e) => e.date >= lastMonthStart && e.date <= lastMonthEnd);
    else if (tab === "Custom" && customStart && customEnd) list = list.filter((e) => e.date >= customStart && e.date <= customEnd);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.desc.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.vendor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, tab, customStart, customEnd, search, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd]);

  const thisMonthTotal = useMemo(() =>
    expenses.filter((e) => e.date >= thisMonthStart && e.date <= thisMonthEnd).reduce((s, e) => s + e.amount, 0),
    [expenses, thisMonthStart, thisMonthEnd]);

  const lastMonthTotal = useMemo(() =>
    expenses.filter((e) => e.date >= lastMonthStart && e.date <= lastMonthEnd).reduce((s, e) => s + e.amount, 0),
    [expenses, lastMonthStart, lastMonthEnd]);

  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    let best = { name: "—", amount: 0 };
    map.forEach((amount, name) => { if (amount > best.amount) best = { name, amount }; });
    return best;
  }, [expenses]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toExpense = (e: Record<string, unknown>): Expense => ({
    id: e.id as string,
    date: e.date as string,
    category: (e.category as string) ?? "Other",
    desc: (e.description as string) ?? "",
    vendor: (e.vendor_name as string) ?? "",
    amount: Number(e.amount) || 0,
    gst: Number(e.gst_amount) || 0,
    paymentMethod: (e.payment_method as string) ?? "Cash",
    receiptUrl: (e.receipt_url as string) ?? null,
  });

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("File must be under 5MB");
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    } catch (err: unknown) {
      toast.error("Receipt upload failed: " + ((err as Error).message || "Unknown error"));
      return null;
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setReceiptFile(null);
    setModalOpen(true);
  };

  const openEditModal = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      date: e.date, category: e.category, desc: e.desc, vendor: e.vendor,
      amount: String(e.amount), gst: e.gst ? String(e.gst) : "", paymentMethod: e.paymentMethod,
    });
    setReceiptFile(null);
    setOpenMenu(null);
    setModalOpen(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.desc.trim() || !form.amount || saving) return;
    setSaving(true);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        setUploading(true);
        receiptUrl = await uploadReceipt(receiptFile);
        setUploading(false);
      }

      const payload: Record<string, unknown> = {
        category: form.category,
        description: form.desc.trim(),
        vendor_name: form.vendor.trim(),
        amount: Number(form.amount),
        gst_amount: Number(form.gst) || 0,
        date: form.date,
        payment_method: form.paymentMethod,
      };
      if (receiptUrl) payload.receipt_url = receiptUrl;

      if (editingId) {
        const data = await api.updateExpense(editingId, payload);
        const updatedExpense = toExpense(data.expense ?? data);
        setExpenses((prev) => prev.map((e) => e.id === editingId ? updatedExpense : e));
        toast.success("Expense updated");
      } else {
        const data = await api.createExpense(payload);
        const newExpense = toExpense(data.expense ?? data);
        setExpenses((prev) => [newExpense, ...prev]);
        toast.success("Expense added");
      }

      setForm(emptyForm);
      setReceiptFile(null);
      setModalOpen(false);
      setEditingId(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save expense");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.deleteExpense(deletingId);
      setExpenses((prev) => prev.filter((e) => e.id !== deletingId));
      setDeletingId(null);
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["Date", "Description", "Category", "Vendor", "Amount", "GST Amount", "Payment Method"];
    const rows = filtered.map((e) => [
      e.date,
      `"${e.desc.replace(/"/g, '""')}"`,
      e.category,
      `"${e.vendor.replace(/"/g, '""')}"`,
      e.amount,
      e.gst,
      e.paymentMethod,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Expenses_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const fmtDate = (d: string) => format(new Date(d + "T00:00:00"), "dd MMM yyyy");
  const isPdf   = (url: string) => url.toLowerCase().includes(".pdf");
  const tabs: FilterTab[] = ["All", "This Month", "Last Month", "Custom"];

  return (
    <DashboardShell>
      {/* Menu backdrop */}
      {openMenu && <div className="fixed inset-0 z-[8]" onClick={() => setOpenMenu(null)} />}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-extrabold">Expenses</h1>
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              <Download size={15} /> Export CSV
            </button>
            {canWrite() && (
              <button onClick={openAddModal}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
                <Plus size={16} /> Add Expense
              </button>
            )}
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-background rounded-2xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="text-2xl font-extrabold text-red-600">{fmt(thisMonthTotal)}</p>
          </div>
          <div className="bg-background rounded-2xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted-foreground mb-1">Last Month</p>
            <p className="text-2xl font-extrabold">{fmt(lastMonthTotal)}</p>
          </div>
          <div className="bg-background rounded-2xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted-foreground mb-1">Top Category</p>
            <p className="text-xl font-extrabold truncate">{topCategory.name}</p>
            {topCategory.amount > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">{fmt(topCategory.amount)}</p>
            )}
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border text-muted-foreground hover:bg-secondary")}>
                {t}
              </button>
            ))}
          </div>

          {tab === "Custom" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">From</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">To</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          )}
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-muted rounded mx-auto" style={{ width: `${60 + i * 10}%` }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center">
            <Wallet size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-bold mb-1">No expenses found</h3>
            <p className="text-sm text-muted-foreground">
              {expenses.length === 0 ? "Track your business expenses to see spending insights." : "Try adjusting your filters or search."}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-5 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                      <th className="text-left py-3 px-4 font-medium">Category</th>
                      <th className="text-left py-3 px-4 font-medium">Vendor</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                      <th className="text-center py-3 px-3 font-medium">Receipt</th>
                      <th className="text-center py-3 px-5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-5 text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="py-3 px-4 max-w-[180px]">
                          <span className="block truncate">{e.desc}</span>
                          {e.paymentMethod !== "Cash" && (
                            <span className="text-[10px] text-muted-foreground">{e.paymentMethod}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-[120px]">
                          <span className="block truncate">{e.vendor || "—"}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold">{fmt(e.amount)}</span>
                          {e.gst > 0 && (
                            <p className="text-[10px] text-muted-foreground">+GST {fmt(e.gst)}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {e.receiptUrl ? (
                            <button onClick={() => setViewingReceipt(e.receiptUrl!)}
                              title="View receipt"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-secondary transition-colors text-primary">
                              <Paperclip size={14} />
                            </button>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <div className="relative inline-block z-[9]">
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setOpenMenu(openMenu === e.id ? null : e.id); }}
                              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                              <MoreVertical size={15} />
                            </button>
                            {openMenu === e.id && (
                              <div className="absolute right-0 top-8 z-[9] bg-background border border-border rounded-xl shadow-lg w-32 py-1 text-sm">
                                <button onClick={() => openEditModal(e)}
                                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary transition-colors">
                                  <Pencil size={13} /> Edit
                                </button>
                                <button onClick={() => { setDeletingId(e.id); setOpenMenu(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 text-red-600 transition-colors">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile Cards ── */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((e) => (
                  <div key={e.id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{e.desc}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.category} · {fmtDate(e.date)}
                        </p>
                        {e.vendor && <p className="text-xs text-muted-foreground">{e.vendor}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-semibold text-sm">{fmt(e.amount)}</p>
                          {e.gst > 0 && <p className="text-[10px] text-muted-foreground">GST {fmt(e.gst)}</p>}
                        </div>
                        {e.receiptUrl && (
                          <button onClick={() => setViewingReceipt(e.receiptUrl!)} className="text-primary p-1">
                            <Paperclip size={13} />
                          </button>
                        )}
                        <div className="relative z-[9]">
                          <button onClick={(ev) => { ev.stopPropagation(); setOpenMenu(openMenu === e.id ? null : e.id); }}
                            className="text-muted-foreground p-1">
                            <MoreVertical size={15} />
                          </button>
                          {openMenu === e.id && (
                            <div className="absolute right-0 top-7 bg-background border border-border rounded-xl shadow-lg w-32 py-1 text-sm z-[9]">
                              <button onClick={() => openEditModal(e)} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary">
                                <Pencil size={13} /> Edit
                              </button>
                              <button onClick={() => { setDeletingId(e.id); setOpenMenu(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 text-red-600">
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Category Pie Chart ── */}
            {pieData.length > 0 && (
              <div className="bg-background rounded-2xl border border-border shadow-sm p-5">
                <h3 className="font-bold text-sm mb-4">Expenses by Category</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmt(v)]}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(214,32%,91%)", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ══ Add / Edit Modal ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/60" onClick={() => setModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between">
                <h3 className="font-bold">{editingId ? "Edit Expense" : "Add Expense"}</h3>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Date + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description *</label>
                  <input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })}
                    placeholder="e.g. Office rent March"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Vendor */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor / Paid To</label>
                  <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    placeholder="e.g. Reliance Digital"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Amount + GST */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (₹) *</label>
                    <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">GST Amount (₹)</label>
                    <input type="number" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })}
                      placeholder="optional"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Receipt <span className="text-muted-foreground/60 font-normal">(image/PDF, max 5MB)</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
                    {receiptFile ? (
                      <>
                        {receiptFile.type.startsWith("image/")
                          ? <ImageIcon size={16} className="text-primary flex-shrink-0" />
                          : <FileText size={16} className="text-primary flex-shrink-0" />}
                        <span className="text-xs truncate flex-1">{receiptFile.name}</span>
                        <button type="button"
                          onClick={(ev) => { ev.stopPropagation(); setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="text-muted-foreground hover:text-red-500 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Paperclip size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">Click to attach receipt</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
                      setReceiptFile(f);
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || uploading || !form.desc.trim() || !form.amount}
                className="w-full bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                {saving || uploading ? "Saving..." : editingId ? "Update Expense" : "Save Expense"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Delete Confirm ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deletingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/60" onClick={() => setDeletingId(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold">Delete Expense?</h3>
              <p className="text-sm text-muted-foreground">This cannot be undone. The expense will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 border border-border py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Receipt Viewer ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {viewingReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80" onClick={() => setViewingReceipt(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-2xl flex flex-col"
              style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <h3 className="font-bold">Receipt</h3>
                <div className="flex items-center gap-2">
                  <a href={viewingReceipt} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-colors inline-flex items-center gap-1.5">
                    <Download size={12} /> Open / Download
                  </a>
                  <button onClick={() => setViewingReceipt(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-secondary/30 min-h-[300px]">
                {isPdf(viewingReceipt) ? (
                  <iframe src={viewingReceipt} className="w-full rounded-lg" style={{ height: "60vh" }} title="Receipt PDF" />
                ) : (
                  <img src={viewingReceipt} alt="Receipt" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
};

export default Expenses;
