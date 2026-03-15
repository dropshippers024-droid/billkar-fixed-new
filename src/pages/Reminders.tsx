import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, MessageCircle, CheckCircle, Check, Clock, AlertCircle, TrendingDown } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api";
import { getBusinessProfile } from "@/lib/businessStore";
import { canUseReminders } from "@/lib/planStore";
import { cn } from "@/lib/utils";

const REMINDERS_KEY = "billkar_reminders";
const getReminders = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "{}"); } catch { return {}; }
};
const saveReminder = (uuid: string) => {
  const r = getReminders();
  r[uuid] = new Date().toISOString();
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(r));
};
const getReminderLabel = (uuid: string): string | null => {
  const r = getReminders();
  if (!r[uuid]) return null;
  const mins = Math.floor((Date.now() - new Date(r[uuid]).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface PendingInvoice {
  uuid: string;
  number: string;
  customer: string;
  phone: string;
  amount: number;
  dueDate: string;
  daysFromToday: number; // negative = overdue, 0 = today, positive = due in X days
}

type ReminderCustomer = {
  name?: string;
  phone?: string;
};

type ReminderInvoice = {
  id: string;
  invoice_number?: string;
  customer_name?: string;
  total_amount?: number | string;
  due_date: string;
  status?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/* ── Demo data for free users ─────────────────────────────────────── */

const DEMO_OVERDUE = [
  { id: "INV-2603-001", customer: "Customer A", amount: 24500, days: 7 },
  { id: "INV-2603-002", customer: "Customer B", amount: 18000, days: 3 },
  { id: "INV-2603-003", customer: "Customer C", amount: 42300, days: 15 },
];

const FreeView = () => (
  <div>
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-extrabold">Payment Reminders</h1>
        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">PRO</span>
      </div>
      <p className="text-sm text-muted-foreground">Never chase payments manually again.</p>
    </div>

    {/* Blurred preview + overlay */}
    <div className="relative mb-8">
      <div className="space-y-3 select-none pointer-events-none blur-[3px] opacity-60">
        {DEMO_OVERDUE.map((d) => (
          <div key={d.id} className="bg-background rounded-2xl border border-border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">{d.id} · {d.customer}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(d.amount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${d.days <= 5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                {d.days} days overdue
              </span>
              <div className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                Send Reminder
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background shadow-2xl rounded-2xl p-7 w-full max-w-sm mx-4 border border-border z-10">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Bell size={26} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-extrabold text-center mb-1">Unlock Payment Reminders</h2>
          <p className="text-xs text-muted-foreground text-center mb-5">Start getting paid faster with Pro</p>
          <ul className="space-y-2.5 mb-6">
            {[
              "Auto-detect overdue invoices",
              "One-tap WhatsApp reminders",
              "Track which customers were reminded",
              "Reduce payment delays by 60%",
            ].map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-emerald-600" strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <button onClick={() => { window.location.href = "/#pricing"; }}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors">
            Upgrade to Pro — ₹399/mo
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">That's just ₹13/day</p>
        </div>
      </div>
    </div>

    {/* How it works */}
    <div className="bg-background rounded-2xl border border-border shadow-sm p-6">
      <h3 className="text-sm font-bold mb-5 text-center text-muted-foreground uppercase tracking-wider">How it works</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: TrendingDown, color: "bg-red-100 text-red-500", step: "1", title: "We detect overdue invoices", desc: "Automatically finds all invoices past their due date" },
          { icon: MessageCircle, color: "bg-emerald-100 text-emerald-600", step: "2", title: "One-tap WhatsApp reminder", desc: "Pre-written message opens in WhatsApp — just hit send" },
          { icon: CheckCircle, color: "bg-indigo-100 text-indigo-600", step: "3", title: "Customer pays, you mark paid", desc: "Track payments and mark invoices as paid in one click" },
        ].map(({ icon: Icon, color, step, title, desc }) => (
          <div key={step} className="flex flex-col items-center text-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">Step {step}</p>
              <p className="text-sm font-semibold mb-1">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Urgency badge ────────────────────────────────────────────────── */

const UrgencyBadge = ({ days }: { days: number }) => {
  if (days < 0) {
    const n = Math.abs(days);
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-red-50 px-2.5 py-1 rounded-full whitespace-nowrap">
        <AlertCircle size={10} /> {n} day{n !== 1 ? "s" : ""} overdue
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
        <Clock size={10} /> Due today
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
        <Clock size={10} /> Due in {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
      Due in {days}d
    </span>
  );
};

/* ── Pro view ─────────────────────────────────────────────────────── */

const ProView = () => {
  const [pending, setPending] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Record<string, string>>(getReminders());

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();

      // Fetch customer phones
      const { customers: custData } = await api.getCustomers();
      const phoneMap: Record<string, string> = {};
      ((custData || []) as ReminderCustomer[]).forEach((c) => { if (c.name && c.phone) phoneMap[c.name] = c.phone; });

      // Fetch ALL invoices, filter client-side for unpaid statuses
      const { invoices: invData } = await api.getInvoices();
      const unpaidStatuses = ["sent", "overdue", "partial"];
      const unpaid = ((invData || []) as ReminderInvoice[]).filter((inv) => unpaidStatuses.includes(String(inv.status || "").toLowerCase()));

      if (unpaid.length > 0) {
        const list: PendingInvoice[] = unpaid.map((inv) => ({
          uuid: inv.id,
          number: inv.invoice_number || "",
          customer: inv.customer_name || "",
          phone: phoneMap[inv.customer_name || ""] || "",
          amount: Number(inv.total_amount) || 0,
          dueDate: inv.due_date,
          daysFromToday: differenceInDays(new Date(inv.due_date), today),
        }));
        // Sort: overdue first (most overdue = most negative first), then upcoming by date
        list.sort((a, b) => a.daysFromToday - b.daysFromToday);
        setPending(list);
      } else {
        setPending([]);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load reminders"));
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = (inv: PendingInvoice) => {
    const profile = getBusinessProfile();
    const isOverdue = inv.daysFromToday < 0;
    const daysOverdue = Math.abs(inv.daysFromToday);
    const msg = isOverdue
      ? `Hi ${inv.customer}, this is a friendly reminder that Invoice #${inv.number} for ${fmt(inv.amount)} was due on ${format(new Date(inv.dueDate), "dd MMM yyyy")} and is now ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue. Please arrange payment at your earliest convenience. Thank you, ${profile.name || "Your Business"}`
      : `Hi ${inv.customer}, this is a friendly reminder that Invoice #${inv.number} for ${fmt(inv.amount)} is due on ${format(new Date(inv.dueDate), "dd MMM yyyy")}. Please arrange payment at your earliest convenience. Thank you, ${profile.name || "Your Business"}`;
    const phone = inv.phone ? inv.phone.replace(/\D/g, "") : "";
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
    saveReminder(inv.uuid);
    localStorage.setItem(`reminder_${inv.uuid}`, new Date().toISOString());
    setReminders(getReminders());
    toast.success(`Reminder sent to ${inv.customer}`);
  };

  const today = new Date().toISOString().split("T")[0];
  const overdue = pending.filter((i) => i.daysFromToday < 0);
  const dueThisWeek = pending.filter((i) => i.daysFromToday >= 0 && i.daysFromToday <= 7);

  const totalOverdueAmt = overdue.reduce((s, i) => s + i.amount, 0);
  const totalWeekAmt = dueThisWeek.reduce((s, i) => s + i.amount, 0);
  const totalPendingAmt = pending.reduce((s, i) => s + i.amount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-extrabold">Payment Reminders</h1>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">PRO</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {overdue.length > 0
              ? `${overdue.length} overdue invoice${overdue.length !== 1 ? "s" : ""} need attention`
              : pending.length > 0
              ? `${pending.length} pending invoice${pending.length !== 1 ? "s" : ""}`
              : "All invoices are up to date"}
          </p>
        </div>
        {overdue.length > 0 && (
          <button onClick={() => overdue.forEach((inv) => sendReminder(inv))}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
            <MessageCircle size={15} /> Send All Overdue
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">Overdue</span>
          </div>
          <p className="text-2xl font-extrabold text-destructive">{overdue.length} <span className="text-sm font-medium text-muted-foreground">invoice{overdue.length !== 1 ? "s" : ""}</span></p>
          <p className="text-sm font-semibold text-destructive mt-0.5">{fmt(totalOverdueAmt)}</p>
        </div>
        <div className="bg-background rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock size={18} className="text-amber-500" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">Due This Week</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-600">{dueThisWeek.length} <span className="text-sm font-medium text-muted-foreground">invoice{dueThisWeek.length !== 1 ? "s" : ""}</span></p>
          <p className="text-sm font-semibold text-amber-600 mt-0.5">{fmt(totalWeekAmt)}</p>
        </div>
        <div className="bg-background rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell size={18} className="text-primary" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">Total Pending</span>
          </div>
          <p className="text-2xl font-extrabold">{pending.length} <span className="text-sm font-medium text-muted-foreground">invoice{pending.length !== 1 ? "s" : ""}</span></p>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">{fmt(totalPendingAmt)}</p>
        </div>
      </div>

      {/* Unified pending list */}
      <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          <h2 className="font-bold text-sm">Pending Payments</h2>
          {pending.length > 0 && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
            <p className="font-bold">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No pending or overdue invoices. Great work!</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-5 py-3 font-semibold">Invoice #</th>
                    <th className="text-left px-5 py-3 font-semibold">Customer</th>
                    <th className="text-right px-5 py-3 font-semibold">Amount</th>
                    <th className="text-left px-5 py-3 font-semibold">Due Date</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 font-semibold">Last Reminded</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((inv) => {
                    const label = getReminderLabel(inv.uuid);
                    return (
                      <tr key={inv.uuid} className={cn(
                        "border-b border-border last:border-0 hover:bg-secondary/30 transition-colors",
                        inv.daysFromToday < 0 && "bg-red-50/30"
                      )}>
                        <td className="px-5 py-3 font-medium">{inv.number}</td>
                        <td className="px-5 py-3">{inv.customer}</td>
                        <td className="px-5 py-3 text-right font-semibold">{fmt(inv.amount)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{format(new Date(inv.dueDate), "dd MMM yyyy")}</td>
                        <td className="px-5 py-3">
                          <UrgencyBadge days={inv.daysFromToday} />
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {label ?? (inv.daysFromToday < 0 ? <span className="text-destructive/70 font-medium">Never</span> : "—")}
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={() => sendReminder(inv)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap",
                              inv.daysFromToday < 0
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "border border-border hover:bg-secondary"
                            )}>
                            <MessageCircle size={12} /> Send Reminder
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {pending.map((inv) => {
                const label = getReminderLabel(inv.uuid);
                return (
                  <div key={inv.uuid} className={cn("p-4", inv.daysFromToday < 0 && "bg-red-50/30")}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{inv.customer}</p>
                        <p className="text-xs text-muted-foreground">{inv.number} · {format(new Date(inv.dueDate), "dd MMM yyyy")}</p>
                      </div>
                      <UrgencyBadge days={inv.daysFromToday} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{fmt(inv.amount)}</p>
                        <p className="text-[10px] text-muted-foreground">Reminded: {label ?? "Never"}</p>
                      </div>
                      <button onClick={() => sendReminder(inv)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          inv.daysFromToday < 0
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border border-border hover:bg-secondary"
                        )}>
                        <MessageCircle size={12} /> Remind
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Main component ───────────────────────────────────────────────── */

const Reminders = () => {
  const isPro = canUseReminders();

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {isPro ? <ProView /> : <FreeView />}
      </motion.div>
    </DashboardShell>
  );
};

export default Reminders;
