import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plus, Search, MoreHorizontal, Eye, Edit, Copy, FileDown, MessageCircle, Mail,
  CreditCard, CheckCircle2, Trash2, X, FileText, ChevronLeft, ChevronRight,
  RefreshCw, Pause, Play, Crown, Bell, Copy as CopyIcon, AlertCircle, Share2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getBusinessProfile } from "@/lib/businessStore";
import { getCurrentPlan, getInvoiceCount, canUseRecurring, canUseReminders, canWrite } from "@/lib/planStore";
import jsPDF from "jspdf";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecurringInvoice {
  id: string;
  customer: string;
  amount: number;
  frequency: string;
  next_date: string;
  end_date: string | null;
  auto_send: boolean;
  active: boolean;
  invoice_data: Record<string, unknown> | null;
}

type InvoiceLineItem = {
  name?: string;
  description?: string;
  quantity?: number | string;
  qty?: number | string;
  rate?: number | string;
  unit_price?: number | string;
  gst_rate?: number | string;
  tax_rate?: number | string;
};

type CustomerLookup = {
  name?: string;
  email?: string;
  phone?: string;
};

type RawPayment = {
  amount?: number | string;
  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
};

type RawInvoice = {
  id: string;
  invoice_number?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  invoice_date?: string;
  due_date?: string;
  total_amount?: number | string;
  amount_paid?: number | string;
  status?: string;
  payments?: RawPayment[];
};

interface Payment {
  amount: number;
  date: string;
  method: string;
  ref: string;
}

interface Invoice {
  uuid: string;       // DB UUID for operations
  id: string;         // invoice_number for display
  customer: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: string;
  payments: Payment[];
}

/* ── Reminder localStorage helpers ─────────── */
const REMINDERS_KEY = "billkar_reminders";
const getReminders = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "{}"); } catch { return {}; }
};
const saveReminder = (uuid: string) => {
  const r = getReminders();
  r[uuid] = new Date().toISOString();
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(r));
};
const getReminderDaysAgo = (uuid: string): number | null => {
  const r = getReminders();
  if (!r[uuid]) return null;
  const days = Math.floor((Date.now() - new Date(r[uuid]).getTime()) / 86400000);
  return days;
};

const statuses = ["All", "Draft", "Sent", "Paid", "Partial", "Overdue"];
const statusStyles: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Sent: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
  Draft: "bg-secondary text-muted-foreground",
  Partial: "bg-amber-100 text-amber-700",
};
const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"];
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-border animate-pulse">
    <div className="h-4 w-4 bg-muted rounded" />
    <div className="h-4 w-24 bg-muted rounded" />
    <div className="h-4 w-28 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-16 bg-muted rounded ml-auto" />
    <div className="h-5 w-14 bg-muted rounded-full" />
  </div>
);

/* ── PDF generator ─────────────────────────── */

function buildSimplePDFDoc(inv: Invoice): jsPDF {
  const profile = getBusinessProfile();
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(profile.name || "Your Business", 14, y);
  y += 7;
  if (profile.gstin) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`GSTIN: ${profile.gstin}`, 14, y);
    y += 5;
  }
  if (profile.address || profile.city || profile.state) {
    doc.setFontSize(9);
    doc.text([profile.address, profile.city, profile.state].filter(Boolean).join(", "), 14, y);
    y += 5;
  }

  y += 5;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", w / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${inv.id}`, 14, y);
  doc.text(`Date: ${format(new Date(inv.date), "dd MMM yyyy")}`, w - 14, y, { align: "right" });
  y += 6;
  doc.text(`Customer: ${inv.customer}`, 14, y);
  doc.text(`Due: ${format(new Date(inv.dueDate), "dd MMM yyyy")}`, w - 14, y, { align: "right" });
  y += 10;

  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Grand Total:", w - 70, y);
  doc.text(fmt(inv.amount), w - 14, y, { align: "right" });
  y += 12;

  if (profile.bankName || profile.accountNumber) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Bank Details", 14, y);
    y += 5;
    if (profile.bankName) { doc.text(`Bank: ${profile.bankName}`, 14, y); y += 4; }
    if (profile.accountNumber) { doc.text(`A/C: ${profile.accountNumber}`, 14, y); y += 4; }
    if (profile.ifsc) { doc.text(`IFSC: ${profile.ifsc}`, 14, y); y += 4; }
    if (profile.upiId) { doc.text(`UPI: ${profile.upiId}`, 14, y); y += 4; }
  }

  return doc;
}

function generateSimplePDF(inv: Invoice) {
  buildSimplePDFDoc(inv).save(`Invoice-${inv.id}.pdf`);
  toast.success("PDF downloaded");
}

/* ── WhatsApp message builder ──────────────── */

function buildWAMessage(inv: Invoice, items: InvoiceLineItem[]): string {
  const profile = getBusinessProfile();
  const bizName = profile.name || "Your Business";
  const dueFormatted = format(new Date(inv.dueDate), "dd MMM yyyy");

  let msg = `*Invoice #${inv.id}* from *${bizName}*\n`;
  msg += `Customer: ${inv.customer}\n`;
  msg += `Date: ${format(new Date(inv.date), "dd MMM yyyy")} | Due: ${dueFormatted}\n`;

  if (items.length > 0) {
    msg += `\n*Items:*\n`;
    let subtotal = 0;
    let totalGst = 0;
    for (const item of items) {
      const qty = Number(item.quantity || item.qty || 1);
      const rate = Number(item.rate || item.unit_price || 0);
      const taxable = qty * rate;
      const gstRate = Number(item.gst_rate || item.tax_rate || 0);
      const gst = taxable * gstRate / 100;
      subtotal += taxable;
      totalGst += gst;
      msg += `• ${item.name || item.description || "Item"} × ${qty} — ₹${taxable.toLocaleString("en-IN")}\n`;
    }
    if (totalGst > 0) {
      msg += `\nSubtotal: ₹${subtotal.toLocaleString("en-IN")}\n`;
      msg += `GST: ₹${totalGst.toLocaleString("en-IN")}\n`;
    }
  }

  msg += `\n*Total: ₹${inv.amount.toLocaleString("en-IN")}*\n`;

  if (profile.upiId) msg += `\nPay via UPI: ${profile.upiId}`;
  else if (profile.bankName) msg += `\nBank: ${profile.bankName} | A/C: ${profile.accountNumber || ""} | IFSC: ${profile.ifsc || ""}`;

  msg += `\n\nThank you for your business!`;
  return msg;
}

/* ── Email content builder ─────────────────── */

function buildEmailContent(inv: Invoice): { subject: string; body: string } {
  const profile = getBusinessProfile();
  const bizName = profile.name || "Your Business";
  const dueFormatted = format(new Date(inv.dueDate), "dd MMM yyyy");
  const paymentLines: string[] = [];
  if (profile.upiId) paymentLines.push(`UPI: ${profile.upiId}`);
  if (profile.bankName) paymentLines.push(`Bank: ${profile.bankName}`);
  if (profile.accountNumber) paymentLines.push(`Account: ${profile.accountNumber}`);
  if (profile.ifsc) paymentLines.push(`IFSC: ${profile.ifsc}`);
  const paymentSection = paymentLines.length > 0 ? `\n\nPayment Details:\n${paymentLines.join("\n")}` : "";
  const subject = `Invoice #${inv.id} from ${bizName}`;
  const body = `Hi ${inv.customer},\n\nPlease find attached Invoice #${inv.id} for ₹${inv.amount.toLocaleString("en-IN")}.\n\nDue Date: ${dueFormatted}${paymentSection}\n\nThank you for your business!\n${bizName}`;
  return { subject, body };
}

/* ── Component ─────────────────────────────── */

const InvoicesList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [slideOver, setSlideOver] = useState<Invoice | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), method: "UPI", ref: "" });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"invoices" | "recurring">(
    () => new URLSearchParams(window.location.search).get("tab") === "recurring" ? "recurring" : "invoices"
  );
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [slideOverItems, setSlideOverItems] = useState<InvoiceLineItem[]>([]);
  const [slideOverLoading, setSlideOverLoading] = useState(false);
  const [reminderModal, setReminderModal] = useState<Invoice | null>(null);
  const [reminderMsg, setReminderMsg] = useState("");
  const [, setReminders] = useState<Record<string, string>>(getReminders());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [, setUpgradeTrigger] = useState("");
  const perPage = 6;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices();
      const invoiceList = Array.isArray(data) ? data : data.invoices || [];

      // Fetch customer emails and phones for enriching invoices
      let customers: CustomerLookup[] = [];
      try {
        const custData = await api.getCustomers();
        customers = Array.isArray(custData) ? custData : custData.customers || [];
      } catch { /* ignore */ }
      const emailMap = new Map<string, string>(
        customers.map((customer) => [String(customer.name || "").toLowerCase().trim(), customer.email || ""])
      );
      const phoneMap = new Map<string, string>(
        customers.map((customer) => [String(customer.name || "").toLowerCase().trim(), customer.phone || ""])
      );

      setInvoices((invoiceList as RawInvoice[]).map((inv) => ({
        uuid: inv.id,
        id: inv.invoice_number,
        customer: inv.customer_name || "",
        customerEmail: emailMap.get((inv.customer_name || "").toLowerCase().trim()) || "",
        customerPhone: phoneMap.get((inv.customer_name || "").toLowerCase().trim()) || "",
        date: inv.invoice_date,
        dueDate: inv.due_date || inv.invoice_date,
        amount: Number(inv.total_amount) || 0,
        amountPaid: Number(inv.amount_paid) || 0,
        status: (inv.status || "draft").charAt(0).toUpperCase() + (inv.status || "draft").slice(1),
        payments: (inv.payments || []).map((payment) => ({
          amount: Number(payment.amount) || 0,
          date: payment.payment_date,
          method: payment.payment_method,
          ref: payment.reference_number || "",
        })),
      })));
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const fetchRecurring = useCallback(async () => {
    setRecurringLoading(true);
    try {
      let generatedCount = 0;
      try {
        const generated = await api.generateDueRecurringInvoices();
        generatedCount = Number(generated?.generatedCount) || 0;
      } catch {
        generatedCount = 0;
      }
      const data = await api.getRecurringInvoices();
      const recurringList = Array.isArray(data) ? data : data?.recurring_invoices || [];
      setRecurringInvoices((recurringList as RecurringInvoice[]).map((item) => {
        const invoiceData = item.invoice_data || {};
        return {
          ...item,
          customer: item.customer || String(invoiceData.customer_name || "Unknown"),
          amount: Number(item.amount || invoiceData.total_amount) || 0,
          auto_send: Boolean(item.auto_send),
          active: Boolean(item.active),
          invoice_data: invoiceData,
        };
      }));
      if (generatedCount > 0) {
        toast.success(`${generatedCount} recurring invoice${generatedCount !== 1 ? "s" : ""} generated`);
        fetchInvoices();
      }
    } finally {
      setRecurringLoading(false);
    }
  }, [fetchInvoices]);

  useEffect(() => { if (activeTab === "recurring") fetchRecurring(); }, [activeTab, fetchRecurring]);

  const openSlideOver = async (inv: Invoice) => {
    setSlideOver(inv);
    setSlideOverItems([]);
    setSlideOverLoading(true);
    try {
      setSlideOverItems(await api.getInvoiceItems(inv.uuid));
    } catch {
      setSlideOverItems([]);
    }
    setSlideOverLoading(false);
  };

  const toggleRecurringActive = async (id: string, active: boolean) => {
    try {
      await api.updateRecurringInvoice(id, { active });
      setRecurringInvoices((prev) => prev.map((r) => r.id === id ? { ...r, active } : r));
      toast.success(active ? "Recurring invoice resumed" : "Recurring invoice paused");
    } catch {
      toast.error("Failed to update recurring invoice");
    }
  };

  const deleteRecurring = async (id: string) => {
    try {
      await api.deleteRecurringInvoice(id);
      setRecurringInvoices((prev) => prev.filter((r) => r.id !== id));
      toast.success("Recurring invoice deleted");
    } catch {
      toast.error("Failed to delete recurring invoice");
    }
  };

  const openReminderModal = (inv: Invoice) => {
    if (!canUseReminders()) { setUpgradeTrigger("reminder"); setUpgradeOpen(true); return; }
    const profile = getBusinessProfile();
    const msg = `Hi ${inv.customer},\n\nThis is a friendly reminder that Invoice #${inv.id} for ${fmt(inv.amount)} was due on ${format(new Date(inv.dueDate), "dd MMM yyyy")}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n${profile.name || "Your Business"}`;
    setReminderMsg(msg);
    setReminderModal(inv);
  };

  const handleEmailInvoice = async (inv: Invoice) => {
    if (!inv.customerEmail) {
      toast.error("No email on file — add the customer's email in the Bill To section when creating an invoice.");
      return;
    }
    const { subject, body } = buildEmailContent(inv);
    window.open(`mailto:${inv.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    // Mark as sent if not already
    if (inv.status.toLowerCase() !== "paid" && inv.status.toLowerCase() !== "sent") {
      await api.updateInvoice(inv.uuid, { status: "sent" });
      updateInvoice(inv.uuid, { status: "Sent" });
    }
    toast.success("Email client opened — attach the PDF and hit send!");
  };

  const handleCopyEmailTemplate = async (inv: Invoice) => {
    const { subject, body } = buildEmailContent(inv);
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Email template copied! Paste in your email app.");
  };

  const handleShareWhatsApp = async (inv: Invoice) => {
    // Fetch items for this invoice (use cached slideOverItems if available)
    let items = slideOver?.uuid === inv.uuid ? slideOverItems : [];
    if (items.length === 0) {
      try {
        items = await api.getInvoiceItems(inv.uuid);
      } catch { items = []; }
    }

    const message = buildWAMessage(inv, items);
    const doc = buildSimplePDFDoc(inv);
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const phone = inv.customerPhone.replace(/\D/g, "").slice(-10);
    const waUrl = phone.length === 10
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    if (isMobile && "share" in navigator) {
      try {
        const blob = doc.output("blob");
        const file = new File([blob], `Invoice-${inv.id}.pdf`, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Invoice #${inv.id}`, text: message });
        } else {
          await navigator.share({ title: `Invoice #${inv.id}`, text: message });
          window.open(waUrl, "_blank");
        }
      } catch {
        window.open(waUrl, "_blank");
      }
    } else {
      doc.save(`Invoice-${inv.id}.pdf`);
      toast.success("PDF downloaded — attach it in WhatsApp");
      setTimeout(() => window.open(waUrl, "_blank"), 800);
    }

    // Mark as sent
    if (inv.status.toLowerCase() !== "paid" && inv.status.toLowerCase() !== "sent") {
      await api.updateInvoice(inv.uuid, { status: "sent" });
      updateInvoice(inv.uuid, { status: "Sent" });
    }
  };

  const handleNativeShare = async (inv: Invoice) => {
    let items = slideOver?.uuid === inv.uuid ? slideOverItems : [];
    if (items.length === 0) {
      try {
        items = await api.getInvoiceItems(inv.uuid);
      } catch { items = []; }
    }
    const message = buildWAMessage(inv, items);
    const doc = buildSimplePDFDoc(inv);
    try {
      const blob = doc.output("blob");
      const file = new File([blob], `Invoice-${inv.id}.pdf`, { type: "application/pdf" });
      await navigator.share({ files: [file], title: `Invoice #${inv.id}`, text: message });
    } catch {
      toast.error("Share cancelled");
    }
  };

  const handleSendReminderWhatsApp = () => {
    if (!reminderModal) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(reminderMsg)}`, "_blank");
    saveReminder(reminderModal.uuid);
    setReminders(getReminders());
    setReminderModal(null);
    toast.success("Reminder sent via WhatsApp");
  };

  const handleCopyReminderMsg = async () => {
    await navigator.clipboard.writeText(reminderMsg);
    if (reminderModal) {
      saveReminder(reminderModal.uuid);
      setReminders(getReminders());
    }
    toast.success("Message copied to clipboard");
  };

  const getDisplayStatus = (inv: Invoice): string => {
    const today = new Date().toISOString().split("T")[0];
    const raw = inv.status.toLowerCase();
    if (raw === "paid") return "Paid";
    if (inv.amountPaid > 0 && inv.amountPaid < inv.amount) return "Partial";
    if (inv.dueDate < today && raw !== "draft") return "Overdue";
    return inv.status;
  };

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let list = invoices;
    if (statusFilter === "Overdue") {
      list = list.filter((i) => i.dueDate < today && i.status.toLowerCase() !== "paid" && i.status.toLowerCase() !== "draft");
    } else if (statusFilter === "Partial") {
      list = list.filter((i) => i.amountPaid > 0 && i.amountPaid < i.amount);
    } else if (statusFilter !== "All") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.id.toLowerCase().includes(q) ||
        i.customer.toLowerCase().includes(q) ||
        String(i.amount).includes(q)
      );
    }
    return list;
  }, [statusFilter, search, invoices]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    const nextSelected = new Set(selected);
    if (nextSelected.has(id)) nextSelected.delete(id);
    else nextSelected.add(id);
    setSelected(nextSelected);
  };
  const toggleAll = () => { if (selected.size === paged.length) setSelected(new Set()); else setSelected(new Set(paged.map((i) => i.uuid))); };

  const updateInvoice = (uuid: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((inv) => inv.uuid === uuid ? { ...inv, ...updates } : inv));
    if (slideOver?.uuid === uuid) setSlideOver((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const markAsSent = async (inv: Invoice) => {
    await api.updateInvoice(inv.uuid, { status: "sent" });
    updateInvoice(inv.uuid, { status: "Sent" });
    toast.success("Invoice marked as sent");
  };

  const markPaid = async (inv: Invoice) => {
    await api.updateInvoice(inv.uuid, { status: "paid", amount_paid: inv.amount, balance_due: 0 });
    updateInvoice(inv.uuid, { status: "Paid", amountPaid: inv.amount });
    toast.success("Invoice marked as paid");
  };

  const deleteInvoice = async (uuid: string) => {
    await api.updateInvoice(uuid, { status: "cancelled" });
    setInvoices((prev) => prev.filter((inv) => inv.uuid !== uuid));
    if (slideOver?.uuid === uuid) setSlideOver(null);
    toast.success("Invoice deleted");
  };

  const handleRecordPayment = async () => {
    if (!slideOver || !paymentForm.amount) return;
    const amt = Number(paymentForm.amount);

    let result: Record<string, unknown> | null = null;
    try {
      result = await api.createPayment({
        invoice_id: slideOver.uuid,
        amount: amt,
        payment_date: paymentForm.date,
        payment_method: paymentForm.method.toLowerCase().replace(" ", "_"),
        reference_number: paymentForm.ref,
      });
    } catch { toast.error("Failed to record payment"); return; }

    const payment = result?.payment;
    const updatedInvoice = result?.invoice;
    const methodValue = String(payment?.payment_method || paymentForm.method);
    const newPayment: Payment = {
      amount: Number(payment?.amount) || amt,
      date: payment?.payment_date || paymentForm.date,
      method: methodValue.includes("_")
        ? methodValue.split("_").map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
        : methodValue,
      ref: payment?.reference_number || paymentForm.ref,
    };
    const totalPaid = Number(updatedInvoice?.amount_paid) || (slideOver.payments.reduce((s, p) => s + p.amount, 0) + newPayment.amount);
    const newStatus = String(updatedInvoice?.status || (totalPaid >= slideOver.amount ? "paid" : "partial"));

    updateInvoice(slideOver.uuid, {
      payments: [...slideOver.payments, newPayment],
      status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      amountPaid: totalPaid,
    });
    setPaymentModal(false);
    setPaymentForm({ amount: "", date: format(new Date(), "yyyy-MM-dd"), method: "UPI", ref: "" });
    toast.success(newStatus.toLowerCase() === "paid" ? "Invoice fully paid!" : "Partial payment recorded");
  };

  const handleAction = (label: string, inv: Invoice) => {
    setMenuOpen(null);
    switch (label) {
      case "View": openSlideOver(inv); break;
      case "Record Payment": openSlideOver(inv); setTimeout(() => setPaymentModal(true), 300); break;
      case "Download PDF": generateSimplePDF(inv); break;
      case "WhatsApp": handleShareWhatsApp(inv); break;
      case "Email": handleEmailInvoice(inv); break;
      case "Mark as Sent": markAsSent(inv); break;
      case "Mark as Paid": markPaid(inv); break;
      case "Send Reminder": openReminderModal(inv); break;
      case "Delete": setDeleteTarget(inv.uuid); break;
    }
  };

  const isFree = getCurrentPlan() === "free";
  const invCount = getInvoiceCount();

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {isFree && invCount > 35 && (
          <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <span>You've used <strong>{invCount}/50</strong> invoices this month.</span>
            <a href="/#pricing" onClick={(e) => { e.preventDefault(); window.location.href = "/#pricing"; }} className="font-semibold underline ml-2 whitespace-nowrap">Upgrade for unlimited →</a>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-extrabold">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === "invoices" ? `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}` : `${recurringInvoices.length} recurring`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-secondary rounded-xl p-1 border border-border">
              <button onClick={() => setActiveTab("invoices")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === "invoices" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                All Invoices
              </button>
              <button onClick={() => setActiveTab("recurring")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", activeTab === "recurring" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <RefreshCw size={11} /> Recurring
                {!canUseRecurring() && <Crown size={10} className="text-primary" />}
              </button>
            </div>
            {canWrite() && (
              <Link to="/dashboard/invoices/new"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity w-fit">
                <Plus size={16} /> New Invoice
              </Link>
            )}
          </div>
        </div>

        {/* Recurring invoices tab */}
        {activeTab === "recurring" && (
          <div>
            {!canUseRecurring() ? (
              <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center">
                <Crown size={40} className="mx-auto text-primary/30 mb-4" />
                <h3 className="font-bold mb-1">Recurring Invoices — Pro Feature</h3>
                <p className="text-sm text-muted-foreground mb-4">Set invoices to auto-generate weekly, monthly, quarterly, or yearly.</p>
                <a href="/#pricing" onClick={(e) => { e.preventDefault(); window.location.href = "/#pricing"; }} className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
                  Upgrade to Pro →
                </a>
              </div>
            ) : recurringLoading ? (
              <div className="bg-background rounded-2xl border border-border shadow-sm p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : recurringInvoices.length === 0 ? (
              <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center">
                <RefreshCw size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-bold mb-1">No recurring invoices yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Enable recurring when creating an invoice to set up a schedule.</p>
                {canWrite() && (
                  <Link to="/dashboard/invoices/new" className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
                    <Plus size={16} /> Create Invoice
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50 text-muted-foreground">
                        <th className="text-left py-3 px-5 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 font-medium">Frequency</th>
                        <th className="text-right py-3 px-4 font-medium">Est. Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Next Date</th>
                        <th className="text-left py-3 px-4 font-medium">End Date</th>
                        <th className="text-center py-3 px-4 font-medium">Status</th>
                        <th className="text-center py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurringInvoices.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="py-3 px-5 font-medium">{r.customer}</td>
                          <td className="py-3 px-4 capitalize text-muted-foreground">{r.frequency}</td>
                          <td className="py-3 px-4 text-right font-semibold">{fmt(r.amount)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{format(new Date(r.next_date), "dd MMM yyyy")}</td>
                          <td className="py-3 px-4 text-muted-foreground">{r.end_date ? format(new Date(r.end_date), "dd MMM yyyy") : "Until cancelled"}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", r.active ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground")}>
                              {r.active ? "Active" : "Paused"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => toggleRecurringActive(r.id, !r.active)}
                                title={r.active ? "Pause" : "Resume"}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                {r.active ? <Pause size={13} /> : <Play size={13} />}
                              </button>
                              <button onClick={() => deleteRecurring(r.id)}
                                title="Delete"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {recurringInvoices.map((r) => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{r.customer}</span>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", r.active ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground")}>
                          {r.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span className="capitalize">{r.frequency} · {format(new Date(r.next_date), "dd MMM yyyy")}</span>
                        <span className="font-semibold text-foreground">{fmt(r.amount)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleRecurringActive(r.id, !r.active)}
                          className="flex-1 py-1.5 rounded-lg border border-border text-xs font-medium flex items-center justify-center gap-1 hover:bg-secondary transition-colors">
                          {r.active ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Resume</>}
                        </button>
                        <button onClick={() => deleteRecurring(r.id)}
                          className="flex-1 py-1.5 rounded-lg border border-border text-xs font-medium text-destructive flex items-center justify-center gap-1 hover:bg-secondary transition-colors">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All invoices tab */}
        {activeTab === "invoices" && (<div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {statuses.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:bg-secondary")}>
                {s}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search invoices..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <button className="text-accent hover:underline text-xs font-medium">Download PDFs</button>
              <button className="text-accent hover:underline text-xs font-medium">Send Reminder</button>
              <button className="text-destructive hover:underline text-xs font-medium">Delete</button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block">
              <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
                {["w-4", "w-24", "w-28", "w-20", "w-20", "w-16", "w-14"].map((w, i) => (
                  <div key={i} className={`h-3 ${w} bg-muted rounded`} />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
            <div className="md:hidden divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="flex justify-between"><div className="h-4 w-32 bg-muted rounded" /><div className="h-4 w-14 bg-muted rounded-full" /></div>
                  <div className="flex justify-between"><div className="h-3 w-40 bg-muted rounded" /><div className="h-4 w-16 bg-muted rounded" /></div>
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-bold mb-1">No invoices found</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first invoice to get started.</p>
            <Link to="/dashboard/invoices/new" className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
              <Plus size={16} /> Create Invoice
            </Link>
          </div>
        ) : (
          <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-3 px-4 w-8"><input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} className="rounded" /></th>
                    <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Due Date</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Reminder</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((inv) => (
                    <tr key={inv.uuid} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => openSlideOver(inv)}>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(inv.uuid)} onChange={() => toggleSelect(inv.uuid)} className="rounded" />
                      </td>
                      <td className="py-3 px-4 font-medium">{inv.id}</td>
                      <td className="py-3 px-4">{inv.customer}</td>
                      <td className="py-3 px-4 text-muted-foreground">{format(new Date(inv.date), "dd MMM yyyy")}</td>
                      <td className="py-3 px-4 text-muted-foreground">{format(new Date(inv.dueDate), "dd MMM yyyy")}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmt(inv.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        {(() => { const ds = getDisplayStatus(inv); return (
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusStyles[ds] || statusStyles.Draft)}>{ds}</span>
                        ); })()}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {!["Paid", "Draft"].includes(getDisplayStatus(inv)) && (() => {
                          const daysAgo = getReminderDaysAgo(inv.uuid);
                          if (daysAgo === null && getDisplayStatus(inv) === "Overdue") {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-red-50 px-2 py-0.5 rounded-full">
                                <AlertCircle size={9} /> No reminder
                              </span>
                            );
                          }
                          if (daysAgo !== null) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                <Bell size={9} /> {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="py-3 px-4 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setMenuOpen(menuOpen === inv.uuid ? null : inv.uuid)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><MoreHorizontal size={16} /></button>
                        <AnimatePresence>
                          {menuOpen === inv.uuid && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-4 top-full mt-1 w-44 bg-background border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                              {[
                                { icon: Eye, label: "View" }, { icon: Edit, label: "Edit" }, { icon: Copy, label: "Duplicate" },
                                { icon: FileDown, label: "Download PDF" }, { icon: MessageCircle, label: "WhatsApp" }, { icon: Mail, label: "Email" },
                                { icon: CreditCard, label: "Record Payment" },
                                ...(getDisplayStatus(inv) === "Draft" ? [{ icon: CheckCircle2, label: "Mark as Sent" }] : []),
                                ...(["Sent", "Overdue", "Partial"].includes(getDisplayStatus(inv)) ? [{ icon: CheckCircle2, label: "Mark as Paid" }] : []),
                                ...(!["Paid", "Draft"].includes(getDisplayStatus(inv)) ? [{ icon: Bell, label: "Send Reminder" }] : []),
                              ].map((a) => (
                                <button key={a.label} onClick={() => handleAction(a.label, inv)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                                  <a.icon size={14} className="text-muted-foreground" />{a.label}
                                </button>
                              ))}
                              <div className="border-t border-border" />
                              <button onClick={() => handleAction("Delete", inv)}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors">
                                <Trash2 size={14} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {paged.map((inv) => (
                <div key={inv.uuid} onClick={() => openSlideOver(inv)} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{inv.customer}</span>
                    {(() => { const ds = getDisplayStatus(inv); return (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyles[ds] || statusStyles.Draft)}>{ds}</span>
                    ); })()}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{inv.id} · {format(new Date(inv.date), "dd MMM")}</span>
                    <span className="font-semibold text-foreground">{fmt(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                <span className="text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>)}
      </motion.div>

      {/* Slide-over */}
      <AnimatePresence>
        {slideOver && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => { setSlideOver(null); setPaymentModal(false); }} className="fixed inset-0 bg-foreground z-40" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-background border-l border-border z-50 overflow-y-auto">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-base">{slideOver.id}</h2>
                  {(() => { const ds = getDisplayStatus(slideOver); return (
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", statusStyles[ds] || statusStyles.Draft)}>{ds}</span>
                  ); })()}
                </div>
                <button onClick={() => { setSlideOver(null); setPaymentModal(false); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Customer & Dates */}
                <div>
                  <p className="text-lg font-bold">{slideOver.customer}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Issued {format(new Date(slideOver.date), "dd MMM yyyy")} · Due {format(new Date(slideOver.dueDate), "dd MMM yyyy")}
                  </p>
                </div>

                {/* Total */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-extrabold text-primary">{fmt(slideOver.amount)}</span>
                  </div>
                  {slideOver.status !== "Paid" && slideOver.payments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid so far</span>
                      <span className="font-semibold text-emerald-600">{fmt(slideOver.payments.reduce((s, p) => s + p.amount, 0))}</span>
                    </div>
                  )}
                  {slideOver.status !== "Paid" && slideOver.payments.length > 0 && (
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance due</span>
                      <span className="font-semibold text-destructive">
                        {fmt(Math.max(0, slideOver.amount - slideOver.payments.reduce((s, p) => s + p.amount, 0)))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items</h3>
                  {slideOverLoading ? (
                    <div className="space-y-2">
                      {[1,2].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
                    </div>
                  ) : slideOverItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items found.</p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary/50 text-xs text-muted-foreground">
                            <th className="text-left px-3 py-2 font-medium">Item</th>
                            <th className="text-right px-3 py-2 font-medium">Qty</th>
                            <th className="text-right px-3 py-2 font-medium">Rate</th>
                            <th className="text-right px-3 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slideOverItems.map((item, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-2">
                                <p className="font-medium truncate max-w-[120px]">{item.description}</p>
                                {item.hsn && <p className="text-[10px] text-muted-foreground">HSN: {item.hsn}</p>}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{fmt(Number(item.rate))}</td>
                              <td className="px-3 py-2 text-right font-semibold">{fmt(Number(item.taxable_amount) + Number(item.cgst || 0) + Number(item.sgst || 0) + Number(item.igst || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* GST Breakup */}
                      {slideOverItems.length > 0 && (() => {
                        const totalCgst = slideOverItems.reduce((s, i) => s + Number(i.cgst || 0), 0);
                        const totalSgst = slideOverItems.reduce((s, i) => s + Number(i.sgst || 0), 0);
                        const totalIgst = slideOverItems.reduce((s, i) => s + Number(i.igst || 0), 0);
                        const taxable = slideOverItems.reduce((s, i) => s + Number(i.taxable_amount || 0), 0);
                        if (totalCgst + totalSgst + totalIgst === 0) return null;
                        return (
                          <div className="border-t border-border px-3 py-2 bg-secondary/30 space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(taxable)}</span></div>
                            {totalCgst > 0 && <div className="flex justify-between"><span>CGST</span><span>{fmt(totalCgst)}</span></div>}
                            {totalSgst > 0 && <div className="flex justify-between"><span>SGST</span><span>{fmt(totalSgst)}</span></div>}
                            {totalIgst > 0 && <div className="flex justify-between"><span>IGST</span><span>{fmt(totalIgst)}</span></div>}
                            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                              <span>Grand Total</span><span>{fmt(slideOver.amount)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  {getDisplayStatus(slideOver) === "Draft" && (
                    <button onClick={() => markAsSent(slideOver)}
                      className="flex-1 py-2 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 text-sm font-semibold hover:bg-blue-100 transition-colors">
                      Mark as Sent
                    </button>
                  )}
                  {["Sent", "Overdue", "Partial"].includes(getDisplayStatus(slideOver)) && (
                    <button onClick={() => markPaid(slideOver)}
                      className="flex-1 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 text-sm font-semibold hover:bg-emerald-100 transition-colors">
                      Mark as Paid
                    </button>
                  )}
                  <button onClick={() => setPaymentModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                    <CreditCard size={14} /> Record Payment
                  </button>
                </div>

                {/* Share */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => generateSimplePDF(slideOver)}
                    className="flex items-center justify-center gap-1.5 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    <FileDown size={14} /> PDF
                  </button>
                  <button onClick={() => handleShareWhatsApp(slideOver)}
                    className="flex items-center justify-center gap-1.5 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button onClick={() => handleEmailInvoice(slideOver)}
                    className="flex items-center justify-center gap-1.5 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    <Mail size={14} /> Email
                  </button>
                  <button onClick={() => handleCopyEmailTemplate(slideOver)}
                    className="flex items-center justify-center gap-1.5 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    <Copy size={14} /> Copy Email
                  </button>
                  {"share" in navigator && (
                    <button onClick={() => handleNativeShare(slideOver)}
                      className="col-span-2 flex items-center justify-center gap-1.5 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors">
                      <Share2 size={14} /> Share (PDF)
                    </button>
                  )}
                </div>
                {(!slideOver.customerEmail || !slideOver.customerPhone) && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {!slideOver.customerEmail && !slideOver.customerPhone
                      ? `No email or phone on file for ${slideOver.customer}.`
                      : !slideOver.customerEmail
                      ? `No email on file for ${slideOver.customer}.`
                      : `No phone on file — WhatsApp will open without a direct chat link.`}
                    {" "}Add it when creating the next invoice.
                  </p>
                )}

                {/* Payment History */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</h3>
                  {slideOver.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {slideOver.payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-card rounded-lg border border-border p-3 text-sm">
                          <div>
                            <p className="font-semibold">{fmt(p.amount)}</p>
                            <p className="text-xs text-muted-foreground">{p.method}{p.ref ? ` · ${p.ref}` : ""}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment modal */}
      <AnimatePresence>
        {paymentModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              onClick={() => setPaymentModal(false)} className="fixed inset-0 bg-foreground z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-background rounded-2xl border border-border shadow-xl z-[70] p-6">
              <h3 className="font-bold mb-4">Record Payment</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (₹)</label>
                  <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder={slideOver ? String(slideOver.amount - slideOver.payments.reduce((s, p) => s + p.amount, 0)) : ""}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                  <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Reference</label>
                  <input value={paymentForm.ref} onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                    placeholder="Transaction ID / cheque no."
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setPaymentModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
                <button onClick={handleRecordPayment} className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Save Payment</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upgrade modal */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setUpgradeOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl overflow-hidden z-10">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-emerald-500" />
            <div className="p-6">
              <button onClick={() => setUpgradeOpen(false)} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center"><Bell size={22} className="text-amber-500" /></div>
                <div>
                  <h2 className="text-base font-extrabold">Payment reminders need Pro</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Upgrade to send payment reminders</p>
                </div>
              </div>
              <button onClick={() => { setUpgradeOpen(false); window.location.href = "/#pricing"; }}
                className="block w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold text-center hover:opacity-90">
                Upgrade to Pro →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder modal */}
      <AnimatePresence>
        {reminderModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              onClick={() => setReminderModal(null)} className="fixed inset-0 bg-foreground z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-background rounded-2xl border border-border shadow-xl z-[70] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-amber-500" />
                  <h3 className="font-bold text-sm">Send Payment Reminder</h3>
                </div>
                <button onClick={() => setReminderModal(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">Message</label>
                  <span className="text-xs text-muted-foreground">Editable</span>
                </div>
                <textarea
                  value={reminderMsg}
                  onChange={(e) => setReminderMsg(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleCopyReminderMsg}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
                  <CopyIcon size={14} /> Copy
                </button>
                <button onClick={handleSendReminderWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) { deleteInvoice(deleteTarget); setDeleteTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
};

export default InvoicesList;
