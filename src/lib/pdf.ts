import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { InvoiceData } from "@/components/invoice/types";
import { calcItemTaxable, calcItemTax, numberToWords } from "@/components/invoice/utils";
import { format } from "date-fns";
import { isPro } from "@/lib/planStore";

export interface InvoiceTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  isIntraState: boolean;
}

const fmtAmt = (n: number) => {
  const safe = Number(n) || 0;
  return "INR " + safe.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtAmtShort = (n: number) => {
  const safe = Number(n) || 0;
  return safe.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type RGB = [number, number, number];

function templateAccent(template: string): RGB {
  switch (template) {
    case "classic":      return [31, 41, 55];
    case "minimal":      return [0, 0, 0];
    case "bold":         return [220, 38, 38];
    case "professional": return [5, 150, 105];
    case "elegant":      return [124, 58, 237];
    case "startup":      return [37, 99, 235];
    case "compact":      return [75, 85, 99];
    default:             return [79, 70, 229];
  }
}

function templateLight(template: string): RGB {
  switch (template) {
    case "classic":      return [243, 244, 246];
    case "minimal":      return [248, 248, 248];
    case "bold":         return [254, 242, 242];
    case "professional": return [236, 253, 245];
    case "elegant":      return [245, 243, 255];
    case "startup":      return [239, 246, 255];
    case "compact":      return [243, 244, 246];
    default:             return [238, 242, 255];
  }
}

export const buildInvoicePDFBlob = async (
  data: InvoiceData,
  totals: InvoiceTotals,
  template = "modern"
): Promise<Blob> => {
  const pdf = new jsPDF("p", "mm", "a4");

  const L = 14;
  const R = 196;
  const PAGE_H = 282;
  const LINE_H = 4.5;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > PAGE_H) { pdf.addPage(); y = 20; }
  };

  const accent = templateAccent(template);
  const light  = templateLight(template);

  const dark    = () => pdf.setTextColor(17, 24, 39);
  const gray    = () => pdf.setTextColor(107, 114, 128);
  const accentC = () => pdf.setTextColor(...accent);
  const white   = () => pdf.setTextColor(255, 255, 255);
  const lightGray = () => pdf.setTextColor(156, 163, 175);

  const hLine = (yPos: number, color = [229, 231, 235] as RGB, width = 0.3) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(width);
    pdf.line(L, yPos, R, yPos);
  };

  const sectionHeader = (title: string, yPos: number) => {
    pdf.setFillColor(...light);
    pdf.roundedRect(L, yPos - 4, R - L, 8, 1, 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    accentC();
    pdf.text(title.toUpperCase(), L + 3, yPos + 0.5);
    return yPos + 8;
  };

  // ── TOP ACCENT BAR ─────────────────────────────────────────────────────────
  pdf.setFillColor(...accent);
  pdf.rect(0, 0, 210, 4, "F");

  // ── HEADER ─────────────────────────────────────────────────────────────────
  let leftY = y;
  let rightY = y;

  // Left: business info
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  dark();
  pdf.text(data.businessName, L, leftY);
  leftY += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  if (data.businessGstin) {
    gray();
    pdf.text(`GSTIN: ${data.businessGstin}`, L, leftY);
    leftY += LINE_H;
  }
  if (data.businessAddress) {
    gray();
    const lines = pdf.splitTextToSize(data.businessAddress, 85);
    pdf.text(lines, L, leftY);
    leftY += lines.length * LINE_H;
  }
  if (data.businessPhone) { gray(); pdf.text(`Ph: ${data.businessPhone}`, L, leftY); leftY += LINE_H; }
  if (data.businessEmail) { gray(); pdf.text(data.businessEmail, L, leftY); leftY += LINE_H; }

  // Right: invoice type + meta
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  accentC();
  pdf.text(data.type.toUpperCase(), R, rightY, { align: "right" });
  rightY += 10;

  // Invoice meta box
  const metaBoxW = 75;
  const metaBoxX = R - metaBoxW;
  pdf.setFillColor(...light);
  pdf.roundedRect(metaBoxX, rightY, metaBoxW, 22, 2, 2, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  dark();
  pdf.text(`Invoice No: ${data.invoiceNumber}`, R - 3, rightY + 6, { align: "right" });
  pdf.setFont("helvetica", "normal");
  gray();
  pdf.text(`Date: ${format(data.date, "dd MMM yyyy")}`, R - 3, rightY + 11, { align: "right" });
  pdf.text(`Due:  ${format(data.dueDate, "dd MMM yyyy")}`, R - 3, rightY + 16, { align: "right" });
  rightY += 26;

  y = Math.max(leftY, rightY) + 4;

  // Accent divider
  pdf.setFillColor(...accent);
  pdf.rect(L, y, R - L, 0.8, "F");
  y += 8;

  // ── INVOICE FOR ────────────────────────────────────────────────────────────
  if ((data as any).invoiceFor) {
    checkPage(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    accentC();
    pdf.text("INVOICE FOR", L, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    dark();
    pdf.text((data as any).invoiceFor, L, y);
    y += 8;
    hLine(y);
    y += 7;
  }

  // ── BILL TO ────────────────────────────────────────────────────────────────
  checkPage(30);
  y = sectionHeader("Bill To", y);
  y += 3;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  dark();
  pdf.text(data.customer.name || "—", L, y);
  y += 5.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  gray();
  if (data.customer.gstin)   { pdf.text(`GSTIN: ${data.customer.gstin}`, L, y);  y += LINE_H; }
  if (data.customer.address) {
    const lines = pdf.splitTextToSize(data.customer.address, 100);
    pdf.text(lines, L, y);
    y += lines.length * LINE_H;
  }
  if (data.customer.state)  { pdf.text(data.customer.state, L, y); y += LINE_H; }
  if (data.customer.phone)  { pdf.text(`Ph: ${data.customer.phone}`, L, y); y += LINE_H; }
  if (data.customer.email)  { pdf.text(data.customer.email, L, y); y += LINE_H; }

  y += 6;

  // ── ITEMS TABLE ────────────────────────────────────────────────────────────
  const C = {
    num:   { x: 14,  w: 7,   label: "#",      align: "center" as const },
    item:  { x: 21,  w: 52,  label: "Item",   align: "left"   as const },
    hsn:   { x: 73,  w: 18,  label: "HSN",    align: "center" as const },
    qty:   { x: 91,  w: 12,  label: "Qty",    align: "right"  as const },
    rate:  { x: 103, w: 24,  label: "Rate",   align: "right"  as const },
    disc:  { x: 127, w: 16,  label: "Disc",   align: "right"  as const },
    gst:   { x: 143, w: 12,  label: "GST%",   align: "center" as const },
    tax:   { x: 155, w: 18,  label: "Tax",    align: "right"  as const },
    total: { x: 173, w: 23,  label: "Total",  align: "right"  as const },
  };

  const cellX = (col: { x: number; w: number; align: "left" | "center" | "right" }) =>
    col.align === "right"    ? col.x + col.w
    : col.align === "center" ? col.x + col.w / 2
    : col.x + 1.5;

  const TH = 7;
  const ROW = 6.5;

  const drawTableHeader = () => {
    pdf.setFillColor(...accent);
    pdf.rect(L, y, R - L, TH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    white();
    for (const col of Object.values(C)) {
      pdf.text(col.label, cellX(col), y + 4.8, { align: col.align });
    }
    y += TH;
  };

  checkPage(TH + ROW + 5);
  drawTableHeader();

  const validItems = data.items.filter((i) => i.name.trim() && (Number(i.rate) || 0) > 0);

  validItems.forEach((item, idx) => {
    if (y + ROW + 2 > PAGE_H) {
      pdf.addPage();
      y = 20;
      drawTableHeader();
    }

    if (idx % 2 === 0) {
      pdf.setFillColor(...light);
      pdf.rect(L, y, R - L, ROW, "F");
    } else {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(L, y, R - L, ROW, "F");
    }

    const taxable = calcItemTaxable(item);
    const tax     = calcItemTax(item);
    const total   = taxable + tax;
    const discAmt = item.discountType === "percent"
      ? (item.rate * item.qty * (item.discountValue || 0)) / 100
      : (item.discountValue || 0);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    dark();

    const nameText = pdf.splitTextToSize(item.name, C.item.w - 2)[0];
    pdf.text(String(idx + 1),            cellX(C.num),   y + 4.2, { align: C.num.align });
    pdf.text(nameText,                   cellX(C.item),  y + 4.2, { align: C.item.align });
    pdf.text(item.hsn || "—",           cellX(C.hsn),   y + 4.2, { align: C.hsn.align });
    pdf.text(`${item.qty} ${item.unit}`, cellX(C.qty),   y + 4.2, { align: C.qty.align });
    pdf.text(fmtAmtShort(item.rate),     cellX(C.rate),  y + 4.2, { align: C.rate.align });
    if (discAmt > 0) {
      pdf.setTextColor(220, 38, 38);
      pdf.text(`-${fmtAmtShort(discAmt)}`, cellX(C.disc), y + 4.2, { align: C.disc.align });
      dark();
    } else {
      gray();
      pdf.text("—",                      cellX(C.disc),  y + 4.2, { align: C.disc.align });
      dark();
    }
    pdf.text(`${item.gstPercent}%`,      cellX(C.gst),   y + 4.2, { align: C.gst.align });
    pdf.text(fmtAmtShort(tax),           cellX(C.tax),   y + 4.2, { align: C.tax.align });
    pdf.setFont("helvetica", "bold");
    pdf.text(fmtAmtShort(total),         cellX(C.total), y + 4.2, { align: C.total.align });

    y += ROW;
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.2);
    pdf.line(L, y, R, y);
  });

  y += 6;

  // ── SUMMARY BOX ────────────────────────────────────────────────────────────
  checkPage(50);

  const sumX = R - 75;
  const sumW = 75;

  pdf.setFillColor(...light);
  pdf.roundedRect(sumX, y, sumW, totals.isIntraState ? 32 : 26, 2, 2, "F");

  const sumRow = (label: string, value: number, bold = false, isTotal = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 9.5 : 8.5);
    if (isTotal) {
      accentC();
    } else {
      gray();
    }
    pdf.text(label, sumX + 3, y + 5);
    if (isTotal) {
      accentC();
    } else {
      dark();
    }
    pdf.text(fmtAmt(value), R - 2, y + 5, { align: "right" });
    y += 6;
  };

  sumRow("Subtotal", totals.subtotal);
  if (totals.isIntraState) {
    sumRow("CGST", totals.cgst);
    sumRow("SGST", totals.sgst);
  } else {
    sumRow("IGST", totals.igst);
  }

  // Grand Total row
  pdf.setFillColor(...accent);
  pdf.roundedRect(sumX, y, sumW, 9, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  white();
  pdf.text("Grand Total", sumX + 3, y + 6);
  pdf.text(fmtAmt(totals.grandTotal), R - 2, y + 6, { align: "right" });
  y += 14;

  // ── AMOUNT IN WORDS ────────────────────────────────────────────────────────
  checkPage(14);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(L, y, R - L - 78, 10, 1, 1, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  accentC();
  pdf.text("Amount in Words:", L + 3, y + 4);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  dark();
  pdf.text(numberToWords(totals.grandTotal), L + 3, y + 8.5);
  y += 14;

  // ── BANK DETAILS ───────────────────────────────────────────────────────────
  const showUpiQR = isPro() && !!data.upiId && totals.grandTotal > 0;
  if (data.bankName || data.accountNumber || data.upiId || showUpiQR) {
    checkPage(35);
    y = sectionHeader("Bank Details", y);
    y += 3;

    const bankStartY = y;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);

    const bankFields = [
      data.bankName      && `Bank: ${data.bankName}`,
      data.accountNumber && `Account No: ${data.accountNumber}`,
      data.ifsc          && `IFSC: ${data.ifsc}`,
      data.upiId         && `UPI ID: ${data.upiId}`,
    ].filter(Boolean) as string[];

    bankFields.forEach((field) => {
      const parts = field.split(": ");
      pdf.setFont("helvetica", "bold");
      gray();
      pdf.text(parts[0] + ": ", L, y);
      pdf.setFont("helvetica", "normal");
      dark();
      pdf.text(parts[1] || "", L + pdf.getStringUnitWidth(parts[0] + ": ") * 8.5 * 0.352778, y);
      y += LINE_H + 0.5;
    });

    if (showUpiQR) {
      const upiUrl = `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.businessName || "Business")}&am=${totals.grandTotal}&cu=INR&tn=Invoice-${data.invoiceNumber}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(upiUrl, { width: 80, margin: 1 });
        const qrSize = 22;
        const qrX = R - qrSize;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        accentC();
        pdf.text("Scan to Pay", qrX + qrSize / 2, bankStartY, { align: "center" });
        pdf.addImage(qrDataUrl, "PNG", qrX, bankStartY + 2, qrSize, qrSize);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        gray();
        pdf.text(data.upiId!, qrX + qrSize / 2, bankStartY + qrSize + 5, { align: "center" });
        y = Math.max(y, bankStartY + qrSize + 8);
      } catch { /* silent */ }
    }
    y += 5;
  }

  // ── NOTES ──────────────────────────────────────────────────────────────────
  if ((data.notes || "").trim()) {
    checkPage(18);
    y = sectionHeader("Notes", y);
    y += 3;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    gray();
    const noteLines = pdf.splitTextToSize(data.notes, R - L - 5);
    pdf.text(noteLines, L, y);
    y += noteLines.length * LINE_H + 6;
  }

  // ── TERMS ──────────────────────────────────────────────────────────────────
  if ((data.terms || "").trim()) {
    checkPage(18);
    y = sectionHeader("Terms & Conditions", y);
    y += 3;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    gray();
    const termLines = pdf.splitTextToSize(data.terms, R - L - 5);
    pdf.text(termLines, L, y);
    y += termLines.length * LINE_H + 6;
  }

  // ── AUTHORISED SIGNATORY ───────────────────────────────────────────────────
  checkPage(20);
  y += 4;
  const sigX = R - 55;
  pdf.setDrawColor(...accent);
  pdf.setLineWidth(0.5);
  pdf.line(sigX, y, R, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  accentC();
  pdf.text("Authorised Signatory", (sigX + R) / 2, y, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  dark();
  pdf.text(data.businessName, (sigX + R) / 2, y + 4, { align: "center" });
  y += 10;

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(...accent);
    pdf.rect(0, 291, 210, 6, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    white();
    
    pdf.text(`Page ${p} of ${totalPages}`, R, 295, { align: "right" });
  }

  return pdf.output("blob");
};

export const generateInvoicePDF = async (
  data: InvoiceData,
  totals: InvoiceTotals,
  template = "modern"
): Promise<void> => {
  const blob = await buildInvoicePDFBlob(data, totals, template);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${data.invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};