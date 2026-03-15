import { getCurrentPlan, isTrialActive, isPro } from "@/lib/planStore";
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, ChevronDown, Save, Mail, MessageCircle, FileDown, Link2, Check, MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { addDays } from "date-fns";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import MobileBottomBar from "@/components/dashboard/MobileBottomBar";
import TemplatePicker from "@/components/invoice/TemplatePicker";
import InvoiceDetailsSection from "@/components/invoice/InvoiceDetailsSection";
import BillToSection from "@/components/invoice/BillToSection";
import ItemsSection from "@/components/invoice/ItemsSection";
import SummarySection from "@/components/invoice/SummarySection";
import AdditionalSection from "@/components/invoice/AdditionalSection";
import LivePreview from "@/components/invoice/LivePreview";
import { emptyItem, emptyCustomer, INDIAN_STATES, type InvoiceItem, type CustomerInfo, type InvoiceData } from "@/components/invoice/types";
import { generateInvoiceNumber } from "@/components/invoice/utils";
import { generateInvoicePDF, buildInvoicePDFBlob } from "@/lib/pdf";
import confetti from "canvas-confetti";
import { calcItemTaxable, calcItemTax, formatCurrency, isIntraState } from "@/components/invoice/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { getBusinessProfile } from "@/lib/businessStore";
import { getInvoiceCount, isLimitReached, incrementInvoiceCount, getCurrentPlan, canUseRecurring } from "@/lib/planStore";
import UpgradeModal from "@/components/UpgradeModal";
import { api } from "@/lib/api";

const sendActions = [
  { icon: Mail, label: "Send via Email" },
  { icon: MessageCircle, label: "Send via WhatsApp" },
  { icon: FileDown, label: "Download PDF" },
  { icon: Link2, label: "Copy Link" },
];

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const InvoiceCreator = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [, setMobileDrawer] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sendDropdown, setSendDropdown] = useState(false);
  const [sendSheet, setSendSheet] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState("");
  const [invoiceCount, setInvoiceCount] = useState(getInvoiceCount());
  const isFree = getCurrentPlan() === "free";

  const profile = useMemo(() => getBusinessProfile(), []);
  const profileEmpty = !profile.name;

  const [template, setTemplate] = useState(() => profile.defaultTemplate || "modern");
  const [invoiceNumber, setInvoiceNumber] = useState(() => generateInvoiceNumber());
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(() => {
    const param = new URLSearchParams(window.location.search).get("type");
    return addDays(new Date(), param === "estimate" ? 15 : 30);
  });
  const [type, setType] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("type");
    if (param === "estimate") return "Estimate";
    if (param === "credit-note") return "Credit Note";
    if (param === "proforma") return "Proforma Invoice";
    if (param === "delivery-challan") return "Delivery Challan";
    return "Tax Invoice";
  });
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer());
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [invoiceFor, setInvoiceFor] = useState("");
  const [terms, setTerms] = useState("1. Payment due within 30 days.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.");

  // Type-specific fields
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [creditReason, setCreditReason] = useState("Goods Returned");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transportDetails, setTransportDetails] = useState("");

  const [businessState, setBusinessState] = useState(() => profile.state || "Telangana");

  // Recurring invoice state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState("monthly");
  const [recurStartDate, setRecurStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurEndDate, setRecurEndDate] = useState("");
  const [recurAutoSend, setRecurAutoSend] = useState(false);

  const invoiceData: InvoiceData = useMemo(() => ({
    template, invoiceNumber, date, dueDate, type, customer, items, notes, terms, invoiceFor,
    businessName: profile.name || "Your Business",
    businessGstin: profile.gstin || "",
    businessState,
    businessAddress: [profile.address, profile.city].filter(Boolean).join(", ") || "",
    businessPhone: profile.phone || "",
    businessEmail: profile.email || "",
    bankName: profile.bankName,
    accountNumber: profile.accountNumber,
    ifsc: profile.ifsc,
    upiId: profile.upiId,
    originalInvoiceNumber,
    creditReason,
    vehicleNumber,
    transportDetails,
  }), [template, invoiceNumber, date, dueDate, type, customer, items, notes, terms, invoiceFor, businessState, profile, originalInvoiceNumber, creditReason, vehicleNumber, transportDetails]);

  const [previewData, setPreviewData] = useState(invoiceData);
  useEffect(() => {
    const t = setTimeout(() => setPreviewData(invoiceData), 300);
    return () => clearTimeout(t);
  }, [invoiceData]);

  const handleDetailChange = useCallback((field: string, value: string | Date) => {
    switch (field) {
      case "invoiceNumber": setInvoiceNumber(String(value)); break;
      case "date":
        if (value instanceof Date) setDate(value);
        break;
      case "dueDate":
        if (value instanceof Date) setDueDate(value);
        break;
      case "type":
        setType(String(value));
        if (value === "Estimate") setDueDate(addDays(new Date(), 15));
        else setDueDate(addDays(new Date(), 30));
        break;
    }
  }, []);

  const buildInvoicePayload = useCallback((status: string) => {
    const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
    const noTax = type === "Delivery Challan" || type === "Estimate";
    const totalTax = noTax ? 0 : items.reduce((s, i) => s + calcItemTax(i), 0);
    const intra = isIntraState(businessState, customer.state);
    const grandTotal = subtotal + totalTax;
    const validItems = items.filter((i) => i.name.trim() && i.rate > 0);

    return {
      customer_name: customer.name.trim(),
      customer_id: customer.id?.trim() || undefined,
      customer_email: customer.email.trim(),
      customer_phone: customer.phone.trim(),
      customer_gstin: customer.gstin.trim(),
      customer_state: customer.state.trim(),
      customer_address: customer.address.trim(),
      invoice_number: invoiceNumber,
      invoice_date: format(date, "yyyy-MM-dd"),
      due_date: format(dueDate, "yyyy-MM-dd"),
      type,
      status,
      subtotal,
      taxable_amount: subtotal,
      cgst: intra ? totalTax / 2 : 0,
      sgst: intra ? totalTax / 2 : 0,
      igst: intra ? 0 : totalTax,
      total_amount: grandTotal,
      amount_paid: 0,
      balance_due: grandTotal,
      notes,
      terms,
      template_id: template,
      is_inter_state: !intra,
      items: validItems.map((item, idx) => ({
        description: item.name,
        hsn: item.hsn,
        quantity: item.qty,
        unit: item.unit,
        rate: item.rate,
        discount_value: item.discountValue,
        discount_type: item.discountType,
        taxable_amount: calcItemTaxable(item),
        gst_rate: item.gstPercent,
        cgst: intra ? calcItemTax(item) / 2 : 0,
        sgst: intra ? calcItemTax(item) / 2 : 0,
        igst: intra ? 0 : calcItemTax(item),
        total: calcItemTaxable(item) + calcItemTax(item),
        sort_order: idx,
      })),
      recurring: isRecurring ? {
        enabled: true,
        frequency: recurFrequency,
        start_date: recurStartDate,
        end_date: recurEndDate || null,
        auto_send: recurAutoSend,
      } : undefined,
    };
  }, [
    items,
    type,
    businessState,
    customer,
    invoiceNumber,
    date,
    dueDate,
    notes,
    terms,
    template,
    isRecurring,
    recurFrequency,
    recurStartDate,
    recurEndDate,
    recurAutoSend,
  ]);

  const incrementTrackedInvoiceCount = useCallback((isNew: boolean) => {
    if (!isNew) return 0;
    incrementInvoiceCount();
    const nextCount = getInvoiceCount();
    setInvoiceCount(nextCount);
    return nextCount;
  }, []);

  // Save Draft — stays on page
  const handleSaveDraft = async () => {
    if (saving || !validateInvoice()) return;
    setSaving(true);
    try {
      const result = await saveInvoice("draft");
      incrementTrackedInvoiceCount(result.isNew);
      setSaved(true);
      toast.success("Draft saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save draft"));
    } finally {
      setSaving(false);
    }
  };

  // Save Invoice — saves draft then redirects to list
  const handleSaveInvoice = async () => {
    if (saving || !validateInvoice()) return;
    if (!savedInvoiceId && isLimitReached()) { setUpgradeTrigger("invoice_limit"); setUpgradeOpen(true); return; }
    setSaving(true);
    try {
      const result = await saveInvoice("draft");
      incrementTrackedInvoiceCount(result.isNew);
      toast.success("Invoice saved!");
      navigate("/dashboard/invoices");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save invoice"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
    const noTax = type === "Delivery Challan" || type === "Estimate";
    const totalTax = noTax ? 0 : items.reduce((s, i) => s + calcItemTax(i), 0);
    const intra = isIntraState(businessState, customer.state);
    try {
      await generateInvoicePDF(invoiceData, {
        subtotal,
        cgst: intra ? totalTax / 2 : 0,
        sgst: intra ? totalTax / 2 : 0,
        igst: intra ? 0 : totalTax,
        grandTotal: subtotal + totalTax,
        isIntraState: intra,
      }, invoiceData.template);
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleWhatsApp = async () => {
    const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
    const noTax = type === "Delivery Challan" || type === "Estimate";
    const totalTax = noTax ? 0 : items.reduce((s, i) => s + calcItemTax(i), 0);
    const grandTotal = subtotal + totalTax;
    const intra = isIntraState(businessState, customer.state);
    const profile = getBusinessProfile();

    // Build professional WA message
    let msg = `*Invoice #${invoiceNumber}* from *${invoiceData.businessName || "Your Business"}*\n`;
    msg += `Customer: ${customer.name}\n`;
    msg += `Date: ${format(date, "dd MMM yyyy")} | Due: ${format(dueDate, "dd MMM yyyy")}\n`;
    const validItems = items.filter((i) => i.name.trim() && i.rate > 0);
    if (validItems.length > 0) {
      msg += `\n*Items:*\n`;
      for (const item of validItems) {
        const taxable = calcItemTaxable(item);
        msg += `• ${item.name} × ${item.qty} — ₹${taxable.toLocaleString("en-IN")}\n`;
      }
      if (totalTax > 0) {
        msg += `\nSubtotal: ₹${subtotal.toLocaleString("en-IN")}\n`;
        msg += `GST: ₹${totalTax.toLocaleString("en-IN")}\n`;
      }
    }
    msg += `\n*Total: ₹${grandTotal.toLocaleString("en-IN")}*\n`;
    if (profile.upiId) msg += `\nPay via UPI: ${profile.upiId}`;
    else if (profile.bankName) msg += `\nBank: ${profile.bankName} | A/C: ${profile.accountNumber || ""} | IFSC: ${profile.ifsc || ""}`;
    msg += `\n\nThank you for your business!`;

    const phone = (customer.phone || "").replace(/\D/g, "").slice(-10);
    const waUrl = phone.length === 10
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile && "share" in navigator) {
      try {
        const blob = await buildInvoicePDFBlob(invoiceData, {
          subtotal, cgst: intra ? totalTax / 2 : 0, sgst: intra ? totalTax / 2 : 0,
          igst: intra ? 0 : totalTax, grandTotal, isIntraState: intra,
        }, invoiceData.template);
        const file = new File([blob], `Invoice-${invoiceNumber}.pdf`, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Invoice #${invoiceNumber}`, text: msg });
        } else {
          await navigator.share({ title: `Invoice #${invoiceNumber}`, text: msg });
          window.open(waUrl, "_blank");
        }
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return; // user cancelled share
        // other errors: fall through to desktop flow
      }
    }

    // Desktop: download PDF then open WhatsApp
    await generateInvoicePDF(invoiceData, {
      subtotal, cgst: intra ? totalTax / 2 : 0, sgst: intra ? totalTax / 2 : 0,
      igst: intra ? 0 : totalTax, grandTotal, isIntraState: intra,
    }, invoiceData.template);
    toast.success("PDF downloaded — attach it in WhatsApp");
    setTimeout(() => window.open(waUrl, "_blank"), 800);
  };

  const validateInvoice = (): boolean => {
    const hasValidItem = items.some((i) => i.name.trim() && i.rate > 0);
    if (!hasValidItem) {
      toast.error("Please add at least one item with a name and rate");
      return false;
    }
    if (!customer.name.trim()) {
      toast.error("Please select or add a customer");
      return false;
    }
    return true;
  };

  const handleSendClick = () => {
    if (saving || !validateInvoice()) return;
    if (!savedInvoiceId && isLimitReached()) {
      setUpgradeTrigger("invoice_limit");
      setUpgradeOpen(true);
      return;
    }
    if (window.innerWidth < 768) {
      setSendSheet(true);
    } else {
      setSendDropdown(!sendDropdown);
    }
  };
  const saveInvoice = useCallback(async (status: string): Promise<{ id: string; isNew: boolean }> => {
    const payload = buildInvoicePayload(status);
    const isNew = !savedInvoiceId;
    const response = savedInvoiceId
      ? await api.updateInvoice(savedInvoiceId, payload)
      : await api.createInvoice(payload);

    const invoice = response?.invoice ?? response;
    const nextId = String(invoice?.id || savedInvoiceId || "");

    if (!nextId) {
      throw new Error("Invoice could not be saved");
    }

    if (!savedInvoiceId) {
      setSavedInvoiceId(nextId);
    }

    return { id: nextId, isNew };
  }, [buildInvoicePayload, savedInvoiceId]);

  const handleSendAction = async (label: string) => {
    if (saving) return;
    setSaving(true);
    setSendDropdown(false);
    setSendSheet(false);

    try {
      const checkFirstInvoice = (count: number) => {
        if (count === 1) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#6366F1", "#059669", "#F59E0B"] });
          toast.success("🎉 Your first invoice! You're officially in business!");
        }
      };

      if (label === "Download PDF") {
        try {
          const result = await saveInvoice("draft");
          const count = incrementTrackedInvoiceCount(result.isNew);
          checkFirstInvoice(count);
        } catch (err) {
          toast.error(`${getErrorMessage(err, "Invoice could not be saved")}. PDF will still download locally.`);
        }
        await handleDownloadPDF();
      } else if (label === "Send via WhatsApp") {
        try {
          const result = await saveInvoice("sent");
          const count = incrementTrackedInvoiceCount(result.isNew);
          checkFirstInvoice(count);
        } catch (err) {
          toast.error(`${getErrorMessage(err, "Invoice could not be saved")}. WhatsApp share will still open.`);
        }
        await handleWhatsApp();
      } else if (label === "Send via Email") {
        if (!customer.email.trim()) {
          toast.error("Add customer email first — fill in the Email field in the Bill To section.");
          return;
        }
        const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
        const totalTax = items.reduce((s, i) => s + calcItemTax(i), 0);
        const grandTotal = subtotal + totalTax;
        const bizName = invoiceData.businessName;
        const dueFormatted = format(dueDate, "dd MMM yyyy");
        const paymentLines: string[] = [];
        if (invoiceData.upiId) paymentLines.push(`UPI: ${invoiceData.upiId}`);
        if (invoiceData.bankName) paymentLines.push(`Bank: ${invoiceData.bankName}`);
        if (invoiceData.accountNumber) paymentLines.push(`Account: ${invoiceData.accountNumber}`);
        if (invoiceData.ifsc) paymentLines.push(`IFSC: ${invoiceData.ifsc}`);
        const paymentSection = paymentLines.length > 0 ? `\n\nPayment Details:\n${paymentLines.join("\n")}` : "";
        const emailSubject = `Invoice #${invoiceNumber} from ${bizName}`;
        const emailBody = `Hi ${customer.name},\n\nPlease find attached Invoice #${invoiceNumber} for ₹${grandTotal.toLocaleString("en-IN")}.\n\nDue Date: ${dueFormatted}${paymentSection}\n\nThank you for your business!\n${bizName}`;

        try {
          const result = await saveInvoice("sent");
          const count = incrementTrackedInvoiceCount(result.isNew);
          checkFirstInvoice(count);
        } catch (err) {
          toast.error(`${getErrorMessage(err, "Invoice could not be saved")}. Email composer will still open.`);
        }

        window.open(`mailto:${customer.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, "_blank");
        toast.success("Email client opened — attach the PDF and hit send!");
      } else if (label === "Copy Link") {
        const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
        const totalTax = items.reduce((s, i) => s + calcItemTax(i), 0);
        const grandTotal = subtotal + totalTax;
        const text = [
          `Invoice ${invoiceNumber}`,
          `From: ${invoiceData.businessName}`,
          `To: ${customer.name}`,
          `Amount: ${formatCurrency(grandTotal)}`,
          `Date: ${format(date, "dd MMM yyyy")}`,
          `Due: ${format(dueDate, "dd MMM yyyy")}`,
        ].join("\n");
        await navigator.clipboard.writeText(text);
        try {
          const result = await saveInvoice("draft");
          const count = incrementTrackedInvoiceCount(result.isNew);
          checkFirstInvoice(count);
        } catch (err) {
          toast.error(`${getErrorMessage(err, "Invoice could not be saved")}. Details were copied locally only.`);
        }
        toast.success("Invoice details copied to clipboard!");
      }
    } finally {
      setSaving(false);
    }
  };

  // Usage bar colors
  const usagePercent = Math.min((invoiceCount / 50) * 100, 100);
  const usageColor = invoiceCount > 45 ? "bg-destructive" : invoiceCount >= 35 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger={upgradeTrigger} />

      <div className={`transition-all duration-200 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"}`}>
        <DashboardTopbar onMobileMenuToggle={() => setMobileDrawer(true)} />

        <div className="bg-background border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-bold text-sm">Create Invoice</h1>
        </div>

        {/* Usage bar */}
        {isFree && (
          <div className="bg-background border-b border-border px-4 md:px-6 py-2.5 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{invoiceCount}/50 invoices this month</span>
                {invoiceCount >= 40 && (
                  <button onClick={() => { setUpgradeTrigger("invoice_limit"); setUpgradeOpen(true); }}
                    className="text-xs font-semibold text-primary hover:underline">Upgrade</button>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usageColor}`} style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="p-3 sm:p-4 md:p-6 pb-36 md:pb-24">
          {profileEmpty && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>Complete your business profile in <Link to="/dashboard/settings" className="font-semibold underline">Settings</Link> for professional invoices.</span>
            </div>
          )}
          <div className="mb-5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Choose Template</label>
            <TemplatePicker selected={template} onSelect={setTemplate} onLockedClick={() => { setUpgradeTrigger("template"); setUpgradeOpen(true); }} />
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div className="w-full lg:w-[55%] space-y-4">
              <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-primary" />
                  <label className="text-sm font-semibold">Your Business State</label>
                </div>
                <select value={businessState} onChange={(e) => setBusinessState(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Determines CGST+SGST (same state) vs IGST (inter-state) on invoices.
                </p>
              </div>

              <InvoiceDetailsSection invoiceNumber={invoiceNumber} date={date} dueDate={dueDate} type={type} onChange={handleDetailChange} />

              {/* Type-specific fields */}
              {type === "Credit Note" && (
                <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-foreground">Credit Note Details</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Original Invoice #</label>
                      <input
                        value={originalInvoiceNumber}
                        onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                        placeholder="e.g., INV-1001"
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
                      <select
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none"
                      >
                        {["Goods Returned", "Service Cancelled", "Overcharge Correction", "Discount Adjustment", "Other"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {type === "Delivery Challan" && (
                <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-foreground">Transport Details</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Vehicle Number</label>
                      <input
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g., MH 01 AB 1234"
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Transport Details</label>
                      <input
                        value={transportDetails}
                        onChange={(e) => setTransportDetails(e.target.value)}
                        placeholder="Courier / Transport name"
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              <BillToSection customer={customer} onChange={setCustomer} />
              <ItemsSection items={items} onChange={setItems} />
              <SummarySection items={items} businessState={businessState} customerState={customer.state} />
              <AdditionalSection notes={notes} terms={terms} invoiceFor={invoiceFor} onNotesChange={setNotes} onTermsChange={setTerms} onInvoiceForChange={setInvoiceFor} />

              {/* Recurring invoice card */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="text-primary" />
                    <span className="text-sm font-semibold">Make this recurring</span>
                    {!canUseRecurring() && (
                      <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">PRO</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canUseRecurring()) { setUpgradeTrigger("recurring"); setUpgradeOpen(true); return; }
                      setIsRecurring(!isRecurring);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isRecurring ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isRecurring ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {isRecurring && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequency</label>
                        <select value={recurFrequency} onChange={(e) => setRecurFrequency(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none">
                          {["weekly", "monthly", "quarterly", "yearly"].map((f) => (
                            <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                        <input type="date" value={recurStartDate} onChange={(e) => setRecurStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date <span className="text-muted-foreground/60">(optional — leave blank to repeat until cancelled)</span></label>
                      <input type="date" value={recurEndDate} onChange={(e) => setRecurEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={recurAutoSend} onChange={(e) => setRecurAutoSend(e.target.checked)}
                        className="rounded border-border" />
                      <span className="text-sm text-foreground">Auto-send to customer when invoice generates</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground bg-primary/5 rounded-lg px-3 py-2">
                      Recurring invoices are created automatically based on the schedule. You can manage them from the <strong>Invoices → Recurring</strong> tab.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="hidden lg:block w-[45%]">
              <div className="sticky top-20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live Preview</p>
                <div>
                  <LivePreview data={previewData} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div
          className={`fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border px-4 md:px-6 py-3 flex items-center justify-between z-30 transition-all duration-200 ${
            sidebarCollapsed ? "md:left-[72px]" : "md:left-[260px]"
          }`}
        >
          {/* Left: Save Draft */}
          <div className="flex items-center gap-3">
            <button onClick={handleSaveDraft} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={15} /> Save Draft
            </button>
            <AnimatePresence>
              {saved && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="hidden sm:flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check size={13} /> Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Preview + Save + Send */}
          <div className="flex items-center gap-2">
            <button onClick={() => setMobilePreview(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
              <Eye size={15} /> Preview
            </button>

            <button onClick={handleSaveInvoice} disabled={saving}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? "Saving..." : "Save"}
            </button>

            <div className="relative">
              <button onClick={handleSendClick} disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Saving..." : "Send"} <ChevronDown size={14} />
              </button>
              {/* Desktop dropdown */}
              <AnimatePresence>
                {sendDropdown && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="hidden md:block absolute bottom-full right-0 mb-2 w-52 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
                    {sendActions.map((a) => (
                      <button key={a.label} onClick={() => handleSendAction(a.label)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors">
                        <a.icon size={15} className="text-muted-foreground" />
                        <span className="flex-1 text-left">{a.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile send bottom sheet */}
        <AnimatePresence>
          {sendSheet && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                onClick={() => setSendSheet(false)} className="md:hidden fixed inset-0 bg-foreground z-50" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="md:hidden fixed inset-x-0 bottom-0 bg-background border-t border-border rounded-t-2xl z-50 p-4" style={{ paddingBottom: "calc(32px + var(--safe-area-bottom))" }}>
                <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
                <p className="font-bold text-sm mb-3">Send Invoice</p>
                <div className="space-y-1">
                    {sendActions.map((a) => (
                     <button key={a.label} onClick={() => handleSendAction(a.label)}
                       className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-secondary transition-colors">
                       <a.icon size={18} className="text-muted-foreground" />
                       <span className="flex-1 text-left">{a.label}</span>
                       {a.label === "Send via WhatsApp" && (
                         <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">FREE</span>
                       )}
                     </button>
                    ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile preview sheet */}
        <AnimatePresence>
          {mobilePreview && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                onClick={() => setMobilePreview(false)} className="lg:hidden fixed inset-0 bg-foreground z-50" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="lg:hidden fixed inset-x-0 bottom-0 top-12 bg-secondary z-50 rounded-t-2xl overflow-y-auto p-4" style={{ paddingBottom: "calc(16px + var(--safe-area-bottom))" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm">Invoice Preview</h3>
                  <button onClick={() => setMobilePreview(false)} className="text-sm text-accent font-medium">Close</button>
                </div>
                <LivePreview data={previewData} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="md:hidden">
        <MobileBottomBar onMenuToggle={() => setMobileDrawer(true)} />
      </div>
    </div>
  );
};

export default InvoiceCreator;
