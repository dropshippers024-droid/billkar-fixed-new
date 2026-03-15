import { getCurrentPlan, isTrialActive, isPro } from "@/lib/planStore";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IndianRupee, TrendingUp, Clock, FileText, X, ArrowRight, Sparkles, RefreshCw, Bell, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import StatCard from "@/components/dashboard/StatCard";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import RevenueChart from "@/components/dashboard/RevenueChart";
import QuickActions from "@/components/dashboard/QuickActions";
import MobileBottomBar from "@/components/dashboard/MobileBottomBar";
import { getUser } from "@/lib/authStore";
import { getBusinessProfile, loadBusinessProfile } from "@/lib/businessStore";
import { refreshPlan } from "@/lib/planStore";
import { api } from "@/lib/api";

const SkeletonCard = () => (
  <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-muted" />
      <div className="space-y-2 flex-1">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-5 w-28 bg-muted rounded" />
      </div>
    </div>
    <div className="h-3 w-32 bg-muted rounded" />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-border animate-pulse">
    <div className="h-4 w-24 bg-muted rounded" />
    <div className="h-4 w-32 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded ml-auto" />
    <div className="h-5 w-14 bg-muted rounded-full" />
  </div>
);

const SkeletonChart = () => (
  <div className="bg-card rounded-2xl border border-border shadow-sm p-5 animate-pulse">
    <div className="h-4 w-28 bg-muted rounded mb-4" />
    <div className="h-48 w-full bg-muted rounded-xl" />
  </div>
);

type DashboardInvoice = {
  id: string;
  invoice_number?: string;
  customer_name?: string;
  invoice_date?: string;
  due_date?: string;
  status?: string;
  total_amount?: number | string;
  balance_due?: number | string;
};

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState(getBusinessProfile().name || getUser()?.name || "");
  const [stats, setStats] = useState([
    { title: "Total Revenue", value: "₹0", change: "Loading...", changeType: "up" as const, icon: IndianRupee, iconColor: "text-primary", iconBg: "bg-primary/10", sparkData: [0, 0, 0, 0, 0, 0, 0] },
    { title: "This Month", value: "₹0", change: "Loading...", changeType: "up" as const, icon: TrendingUp, iconColor: "text-accent", iconBg: "bg-accent/10", sparkData: [0, 0, 0, 0, 0, 0, 0] },
    { title: "Pending", value: "₹0", change: "Loading...", changeType: "up" as const, icon: Clock, iconColor: "text-amber-600", iconBg: "bg-amber-100", sparkData: [0, 0, 0, 0, 0, 0, 0] },
    { title: "Total Invoices", value: "0", change: "Loading...", changeType: "up" as const, icon: FileText, iconColor: "text-primary", iconBg: "bg-primary/10", sparkData: [0, 0, 0, 0, 0, 0, 0] },
  ]);
  const [hasInvoices, setHasInvoices] = useState(false);
  const [dueRecurring, setDueRecurring] = useState(0);
  const [generatingRecurring, setGeneratingRecurring] = useState(false);
  const [overdueInvoices, setOverdueInvoices] = useState<{ id: string; number: string; customer: string; amount: number; daysOverdue: number }[]>([]);
  const [totalOverdue, setTotalOverdue] = useState(0);

  useEffect(() => {
    const load = async () => {
      const profile = await loadBusinessProfile();
      setUserName(profile.name || getUser()?.name || "");

      if (!api.isLoggedIn()) { setLoading(false); return; }

      // Refresh plan from server so admin changes are picked up
      refreshPlan().catch(() => {});

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      try {
        const { invoices: allInvoices } = await api.getInvoices();
        const invoiceData = ((allInvoices || []) as DashboardInvoice[]).filter((i) => i.status !== "cancelled");

        if (invoiceData.length > 0) {
          setHasInvoices(true);
          const total = invoiceData.reduce((s: number, i) => s + (Number(i.total_amount) || 0), 0);
          const thisMonth = invoiceData.filter((i) => i.invoice_date >= monthStart).reduce((s: number, i) => s + (Number(i.total_amount) || 0), 0);
          const pending = invoiceData.filter((i) => ["sent", "overdue", "partial"].includes(i.status || "")).reduce((s: number, i) => s + (Number(i.balance_due) || 0), 0);
          const overdueCount = invoiceData.filter((i) => i.status === "overdue").length;
          const monthCount = invoiceData.filter((i) => i.invoice_date >= monthStart).length;

          const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
          setStats([
            { title: "Total Revenue", value: fmt(total), change: `${monthCount} this month`, changeType: "up" as const, icon: IndianRupee, iconColor: "text-primary", iconBg: "bg-primary/10", sparkData: [0, 0, 0, 0, 0, 0, total / 7] },
            { title: "This Month", value: fmt(thisMonth), change: `${monthCount} invoices`, changeType: "up" as const, icon: TrendingUp, iconColor: "text-accent", iconBg: "bg-accent/10", sparkData: [0, 0, 0, 0, 0, 0, thisMonth / 7] },
            { title: "Pending", value: fmt(pending), change: overdueCount > 0 ? `${overdueCount} overdue` : "All on track", changeType: overdueCount > 0 ? "down" as const : "up" as const, icon: Clock, iconColor: "text-amber-600", iconBg: "bg-amber-100", sparkData: [0, 0, 0, 0, 0, 0, pending / 7] },
            { title: "Total Invoices", value: String(invoiceData.length), change: `${monthCount} this month`, changeType: "up" as const, icon: FileText, iconColor: "text-primary", iconBg: "bg-primary/10", sparkData: [0, 0, 0, 0, 0, 0, invoiceData.length] },
          ]);

          // Filter overdue invoices client-side for payment reminders
          const overdueData = invoiceData.filter(
            (i) => ["sent", "overdue", "partial"].includes(i.status || "") && i.due_date && i.due_date < today
          );
          if (overdueData.length > 0) {
            const items = overdueData
              .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
              .map((inv) => ({
                id: inv.id,
                number: inv.invoice_number,
                customer: inv.customer_name || "Unknown",
                amount: Number(inv.balance_due) || 0,
                daysOverdue: Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000),
              }));
            setOverdueInvoices(items.slice(0, 5));
            setTotalOverdue(overdueData.reduce((s: number, i) => s + (Number(i.balance_due) || 0), 0));
          } else {
            setOverdueInvoices([]);
            setTotalOverdue(0);
          }
        } else {
          // No invoices — show ₹0 with helpful change text
          setStats([
            { title: "Total Revenue", value: "₹0", change: "No invoices yet", changeType: "up" as const, icon: IndianRupee, iconColor: "text-primary", iconBg: "bg-primary/10", sparkData: [0, 0, 0, 0, 0, 0, 0] },
            { title: "This Month", value: "₹0", change: "Create your first", changeType: "up" as const, icon: TrendingUp, iconColor: "text-accent", iconBg: "bg-accent/10", sparkData: [0, 0, 0, 0, 0, 0, 0] },
            { title: "Pending", value: "₹0", change: "All clear", changeType: "up" as const, icon: Clock, iconColor: "text-amber-600", iconBg: "bg-amber-100", sparkData: [0, 0, 0, 0, 0, 0, 0] },
            { title: "Total Invoices", value: "0", change: "Get started below", changeType: "up" as const, icon: FileText, iconColor: "text-primary", iconBg: "bg-primary/10", sparkData: [0, 0, 0, 0, 0, 0, 0] },
          ]);
          setOverdueInvoices([]);
          setTotalOverdue(0);
        }

        try {
          const recurringData = await api.getRecurringInvoices();
          setDueRecurring(Number(recurringData?.due_count) || 0);
        } catch {
          setDueRecurring(0);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }

      setLoading(false);
    };
    load();
  }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <AnimatePresence>
        {mobileDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setMobileDrawer(false)} className="md:hidden fixed inset-0 bg-foreground z-50" />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-background border-r border-border z-50 overflow-y-auto">
              <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <span className="text-xl font-extrabold">Bill<span className="text-gradient-primary">Kar</span></span>
                <button onClick={() => setMobileDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <nav className="py-4 px-3 space-y-1">
                {[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Invoices", href: "/dashboard/invoices" },
                  { label: "Estimates", href: "/dashboard/estimates" },
                  { label: "Products", href: "/dashboard/products" },
                  { label: "Customers", href: "/dashboard/customers" },
                  { label: "Settings", href: "/dashboard/settings" },
                ].map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMobileDrawer(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary">
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`transition-all duration-200 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"}`}>
        <DashboardTopbar onMobileMenuToggle={() => setMobileDrawer(true)} />

        <main className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="bg-background rounded-2xl border border-border shadow-sm p-5 border-l-4 border-l-primary">
            <h1 className="text-xl md:text-2xl font-extrabold">
              {userName ? `${greeting}, ${userName} 👋` : `${greeting} 👋`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{today}</p>
          </motion.div>

          {/* Recurring invoices due notification */}
          {dueRecurring > 0 && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3.5 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    You have {dueRecurring} recurring invoice{dueRecurring !== 1 ? "s" : ""} due today
                  </p>
                  <p className="text-xs text-muted-foreground">Generate them now to keep your billing on schedule</p>
                </div>
              </div>
              <Link
                to="/dashboard/invoices?tab=recurring"
                className="flex-shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Generate now <ArrowRight size={13} />
              </Link>
            </motion.div>
          )}

          {/* Welcome banner for new users */}
          {!hasInvoices && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Link to="/dashboard/invoices/new"
                className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-2xl p-5 group hover:bg-accent/15 transition-colors">
                <div>
                  <p className="font-semibold text-accent">Welcome! Create your first invoice to get started</p>
                  <p className="text-sm text-muted-foreground mt-0.5">It only takes 30 seconds</p>
                </div>
                <ArrowRight size={20} className="text-accent group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : stats.map((s, i) => <StatCard key={s.title} {...s} delay={0.1 + i * 0.05} />)
            }
          </div>

          {/* Content row */}
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              {loading ? (
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border animate-pulse"><div className="h-4 w-32 bg-muted rounded" /></div>
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : <RecentInvoices />}
            </div>
            <div className="lg:col-span-2">
              {loading ? <SkeletonChart /> : <RevenueChart />}
            </div>
          </div>

          <QuickActions />

          {/* Payment Reminders — Pro only */}
          {overdueInvoices.length > 0 && !loading && getCurrentPlan() !== "free" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <Bell size={16} className="text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Payment Reminders</h3>
                    <p className="text-xs text-muted-foreground">
                      {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? "s" : ""} overdue · ₹{totalOverdue.toLocaleString("en-IN")} pending
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Open WhatsApp for first overdue invoice
                    const inv = overdueInvoices[0];
                    const msg = `Hi ${inv.customer},\n\nThis is a reminder that Invoice #${inv.number} for ₹${inv.amount.toLocaleString("en-IN")} is ${inv.daysOverdue} day${inv.daysOverdue !== 1 ? "s" : ""} overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                  className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <MessageCircle size={12} /> Send All Reminders
                </button>
              </div>
              <div className="divide-y divide-border">
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{inv.customer}</p>
                      <p className="text-xs text-muted-foreground">#{inv.number} · <span className="text-destructive font-medium">{inv.daysOverdue}d overdue</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">₹{inv.amount.toLocaleString("en-IN")}</span>
                      <button
                        onClick={() => {
                          const msg = `Hi ${inv.customer},\n\nThis is a reminder that Invoice #${inv.number} for ₹${inv.amount.toLocaleString("en-IN")} is ${inv.daysOverdue} day${inv.daysOverdue !== 1 ? "s" : ""} overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-destructive bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Bell size={11} /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Upgrade card for free plan */}
          {getCurrentPlan() === "free" && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <button onClick={() => { window.location.href = "/#pricing"; }}
                className="block w-full text-left bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 border border-primary/20 rounded-2xl p-6 group hover:from-primary/20 hover:to-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">🚀 Unlock BillKar Pro</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Unlimited invoices, premium templates, payment reminders. ₹399/mo</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold group-hover:scale-105 transition-transform">
                    Upgrade →
                  </span>
                </div>
              </button>
            </motion.div>
          )}
        </main>
      </div>

      <MobileBottomBar onMenuToggle={() => setMobileDrawer(true)} />
    </div>
  );
};

export default Dashboard;
