import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Search, MoreHorizontal, Eye, FileDown, MessageCircle, Mail,
  Trash2, X, FileText, ChevronLeft, ChevronRight, ArrowRightLeft
} from "lucide-react";
import { addDays, format } from "date-fns";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getBusinessProfile } from "@/lib/businessStore";
import { generateInvoiceNumber } from "@/components/invoice/utils";

interface Estimate {
  id: string;
  invoiceNumber: string;
  customer: string;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  customerGstin: string;
  customerState: string;
  date: string;
  validUntil: string;
  amount: number;
  status: string;
  record: EstimateRecord;
}

type EstimateRecord = {
  id: string;
  type?: string;
  status?: string;
  customer_id?: string;
  invoice_number?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_gstin?: string;
  customer_state?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number | string;
  taxable_amount?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  total_amount?: number | string;
  notes?: string;
  terms?: string;
  template_id?: string;
  is_inter_state?: number | boolean;
};

type EstimateItem = {
  name?: string;
  description?: string;
  quantity?: number | string;
  qty?: number | string;
  rate?: number | string;
  unit_price?: number | string;
  gst_rate?: number | string;
  tax_rate?: number | string;
};

const statuses = ["All", "Draft", "Sent", "Accepted", "Rejected", "Expired"];
const statusStyles: Record<string, string> = {
  accepted: "bg-emerald-100 text-emerald-700",
  sent:     "bg-blue-100 text-blue-700",
  draft:    "bg-secondary text-muted-foreground",
  rejected: "bg-red-100 text-red-700",
  expired:  "bg-secondary text-muted-foreground",
};
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
const formatDateLabel = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMM yyyy");
};

function buildEstimatePDFDoc(est: Estimate): jsPDF {
  const profile = getBusinessProfile();
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
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

  y += 5;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", width / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Estimate #: ${est.invoiceNumber}`, 14, y);
  doc.text(`Date: ${formatDateLabel(est.date)}`, width - 14, y, { align: "right" });
  y += 6;
  doc.text(`Customer: ${est.customer}`, 14, y);
  doc.text(`Valid Until: ${formatDateLabel(est.validUntil)}`, width - 14, y, { align: "right" });
  y += 10;

  doc.setDrawColor(200);
  doc.line(14, y, width - 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Estimated Total:", width - 80, y);
  doc.text(fmt(est.amount), width - 14, y, { align: "right" });

  return doc;
}

function buildEstimateMessage(est: Estimate, items: EstimateItem[]): string {
  const profile = getBusinessProfile();
  let msg = `*Estimate #${est.invoiceNumber}* from *${profile.name || "Your Business"}*\n`;
  msg += `Customer: ${est.customer}\n`;
  msg += `Date: ${formatDateLabel(est.date)} | Valid Until: ${formatDateLabel(est.validUntil)}\n`;

  if (items.length > 0) {
    msg += `\n*Items:*\n`;
    for (const item of items) {
      const qty = Number(item.quantity || item.qty || 1);
      const rate = Number(item.rate || item.unit_price || 0);
      const taxable = qty * rate;
      msg += `• ${item.name || item.description || "Item"} × ${qty} — ₹${taxable.toLocaleString("en-IN")}\n`;
    }
  }

  msg += `\n*Estimated Total: ${fmt(est.amount)}*`;
  return msg;
}

function buildEstimateEmail(est: Estimate): { subject: string; body: string } {
  const profile = getBusinessProfile();
  const subject = `Estimate #${est.invoiceNumber} from ${profile.name || "Your Business"}`;
  const body = `Hi ${est.customer},\n\nPlease find Estimate #${est.invoiceNumber} for ${fmt(est.amount)}.\n\nValid Until: ${formatDateLabel(est.validUntil)}\n\nThank you,\n${profile.name || "Your Business"}`;
  return { subject, body };
}

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-border animate-pulse">
    <div className="h-4 w-24 bg-muted rounded" />
    <div className="h-4 w-28 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-16 bg-muted rounded ml-auto" />
    <div className="h-5 w-14 bg-muted rounded-full" />
  </div>
);

const Estimates = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [slideOver, setSlideOver] = useState<Estimate | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      const { invoices } = await api.getInvoices();
      const estimateRows = ((invoices || []) as EstimateRecord[])
        .filter((r) => r.type === "Estimate" && r.status !== "cancelled");

      setEstimates(estimateRows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        customer: r.customer_name || "Unknown",
        customerId: r.customer_id || "",
        customerEmail: r.customer_email || "",
        customerPhone: r.customer_phone || "",
        customerGstin: r.customer_gstin || "",
        customerState: r.customer_state || "",
        date: r.invoice_date || "",
        validUntil: r.due_date || "",
        amount: Number(r.total_amount) || 0,
        status: r.status || "draft",
        record: r,
      })));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load estimates"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstimates(); }, []);

  const filtered = useMemo(() => {
    let list = estimates;
    if (statusFilter !== "All") list = list.filter((i) => i.status.toLowerCase() === statusFilter.toLowerCase());
    if (search) list = list.filter((i) =>
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.customer.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [estimates, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async (est: Estimate) => {
    setMenuOpen(null);
    if (!confirm(`Delete estimate ${est.invoiceNumber}?`)) return;
    try {
      await api.updateInvoice(est.id, { status: "cancelled" });
      toast.success("Estimate deleted");
      setEstimates((prev) => prev.filter((e) => e.id !== est.id));
      if (slideOver?.id === est.id) setSlideOver(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const updateEstimateStatus = async (est: Estimate, status: string) => {
    await api.updateInvoice(est.id, { status });
    setEstimates((prev) => prev.map((item) => item.id === est.id ? { ...item, status } : item));
    if (slideOver?.id === est.id) {
      setSlideOver((prev) => prev ? { ...prev, status } : prev);
    }
  };

  const getEstimateItems = async (estimateId: string): Promise<EstimateItem[]> => {
    try {
      return await api.getInvoiceItems(estimateId);
    } catch {
      return [];
    }
  };

  const handleDownloadPDF = (est: Estimate) => {
    buildEstimatePDFDoc(est).save(`Estimate-${est.invoiceNumber}.pdf`);
    toast.success("PDF downloaded");
  };

  const handleWhatsApp = async (est: Estimate) => {
    const items = await getEstimateItems(est.id);
    const message = buildEstimateMessage(est, items);
    const phone = est.customerPhone.replace(/\D/g, "").slice(-10);
    const waUrl = phone.length === 10
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    buildEstimatePDFDoc(est).save(`Estimate-${est.invoiceNumber}.pdf`);
    window.open(waUrl, "_blank");

    if (est.status.toLowerCase() === "draft") {
      await updateEstimateStatus(est, "sent");
    }
    toast.success("Estimate shared via WhatsApp");
  };

  const handleEmail = async (est: Estimate) => {
    if (!est.customerEmail) {
      toast.error("No email on file for this customer.");
      return;
    }
    const { subject, body } = buildEstimateEmail(est);
    window.open(`mailto:${est.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    if (est.status.toLowerCase() === "draft") {
      await updateEstimateStatus(est, "sent");
    }
    toast.success("Email client opened");
  };

  const handleConvertToInvoice = async (est: Estimate) => {
    try {
      const items = await getEstimateItems(est.id);
      const invoiceDate = new Date();
      const dueDate = addDays(invoiceDate, 30);
      await api.createInvoice({
        customer_id: est.customerId || undefined,
        customer_name: est.customer,
        customer_email: est.customerEmail,
        customer_phone: est.customerPhone,
        customer_gstin: est.customerGstin,
        customer_state: est.customerState,
        invoice_number: generateInvoiceNumber(),
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: format(dueDate, "yyyy-MM-dd"),
        type: "Tax Invoice",
        status: "draft",
        subtotal: Number(est.record.subtotal) || 0,
        taxable_amount: Number(est.record.taxable_amount) || Number(est.record.subtotal) || 0,
        cgst: Number(est.record.cgst) || 0,
        sgst: Number(est.record.sgst) || 0,
        igst: Number(est.record.igst) || 0,
        total_amount: Number(est.record.total_amount) || est.amount,
        amount_paid: 0,
        balance_due: Number(est.record.total_amount) || est.amount,
        notes: est.record.notes || "",
        terms: est.record.terms || "",
        template_id: est.record.template_id || "modern",
        is_inter_state: Boolean(est.record.is_inter_state),
        items,
      });
      toast.success("Estimate converted to invoice");
      navigate("/dashboard/invoices");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to convert estimate"));
    }
  };

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-extrabold">Estimates</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} estimate{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/dashboard/invoices/new?type=estimate"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity w-fit">
            <Plus size={16} /> New Estimate
          </Link>
        </div>

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
              placeholder="Search estimates..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block">
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
          <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-bold mb-1">No estimates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first estimate to get started.</p>
            <Link to="/dashboard/invoices/new?type=estimate" className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
              <Plus size={16} /> Create Estimate →
            </Link>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Estimate #</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Valid Until</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((est) => (
                    <tr key={est.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => setSlideOver(est)}>
                      <td className="py-3 px-4 font-medium">{est.invoiceNumber}</td>
                      <td className="py-3 px-4">{est.customer}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDateLabel(est.date)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDateLabel(est.validUntil)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmt(est.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", statusStyles[est.status] || "bg-secondary text-muted-foreground")}>{est.status}</span>
                      </td>
                      <td className="py-3 px-4 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setMenuOpen(menuOpen === est.id ? null : est.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><MoreHorizontal size={16} /></button>
                        <AnimatePresence>
                          {menuOpen === est.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-4 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                              {[
                                { icon: Eye, label: "View", action: () => setSlideOver(est) },
                                { icon: FileDown, label: "Download PDF", action: () => handleDownloadPDF(est) },
                                { icon: MessageCircle, label: "WhatsApp", action: () => handleWhatsApp(est) },
                                { icon: Mail, label: "Email", action: () => handleEmail(est) },
                                { icon: ArrowRightLeft, label: "Convert to Invoice", action: () => handleConvertToInvoice(est) },
                              ].map((a) => (
                                <button key={a.label} onClick={() => { setMenuOpen(null); a.action(); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-secondary transition-colors">
                                  <a.icon size={14} className="text-muted-foreground" />{a.label}
                                </button>
                              ))}
                              <div className="border-t border-border" />
                              <button onClick={() => handleDelete(est)}
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
              {paged.map((est) => (
                <div key={est.id} onClick={() => setSlideOver(est)} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{est.customer}</span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", statusStyles[est.status] || "bg-secondary text-muted-foreground")}>{est.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{est.invoiceNumber} · {formatDateLabel(est.date)}</span>
                    <span className="font-semibold text-foreground">{fmt(est.amount)}</span>
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
      </motion.div>

      {/* Slide-over */}
      <AnimatePresence>
        {slideOver && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setSlideOver(null)} className="fixed inset-0 bg-foreground z-40" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[50%] bg-card border-l border-border z-50 overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-bold">{slideOver.invoiceNumber}</h2>
                <button onClick={() => setSlideOver(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold">{slideOver.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateLabel(slideOver.date)} · Valid until {formatDateLabel(slideOver.validUntil)}
                    </p>
                  </div>
                  <span className={cn("text-xs font-semibold px-3 py-1 rounded-full capitalize", statusStyles[slideOver.status] || "bg-secondary text-muted-foreground")}>{slideOver.status}</span>
                </div>

                <div className="bg-background rounded-xl border border-border p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-extrabold text-primary">{fmt(slideOver.amount)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleConvertToInvoice(slideOver)}
                  className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <ArrowRightLeft size={16} /> Convert to Invoice
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadPDF(slideOver)}
                    className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    <FileDown size={15} /> PDF
                  </button>
                  <button
                    onClick={() => handleWhatsApp(slideOver)}
                    className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button
                    onClick={() => handleEmail(slideOver)}
                    className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2 text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    <Mail size={15} /> Email
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
};

export default Estimates;
