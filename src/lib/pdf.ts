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
  return "\u20B9" + safe.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type RGB = [number, number, number];

function templateAccent(template: string): RGB {
  switch (template) {
    case "classic":      return [31, 41, 55];     // gray-800
    case "minimal":      return [0, 0, 0];         // black
    case "bold":         return [220, 38, 38];      // red-600
    case "professional": return [5, 150, 105];      // emerald-600
    case "elegant":      return [124, 58, 237];     // violet-600
    case "startup":      return [37, 99, 235];      // blue-600
    case "compact":      return [75, 85, 99];       // gray-600
    default:             return [79, 70, 229];      // indigo-600 (modern)
  }
}

export const buildInvoicePDFBlob = async (
  data: InvoiceData,
  totals: InvoiceTotals,
  template = "modern"
): Promise<Blob> => {
  const pdf = new jsPDF("p", "mm", "a4");

  const L = 14;        // left margin
  const R = 196;       // right margin (210 - 14)
  const PAGE_H = 282;  // usable page height
  const LINE_H = 4.5;
  let y = 20;          // start below brand bar

  const checkPage = (needed = 10) => {
    if (y + needed > PAGE_H) { pdf.addPage(); y = 20; }
  };

  const accent = templateAccent(template);

  const dark    = () => pdf.setTextColor(17, 24, 39);
  const gray    = () => pdf.setTextColor(107, 114, 128);
  const accentC = () => pdf.setTextColor(...accent);
  const white   = () => pdf.setTextColor(255, 255, 255);

  const hLine = (yPos: number, color = [229, 231, 235] as RGB) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.3);
    pdf.line(L, yPos, R, yPos);
  };

  // ── BRAND BAR (thin accent line at very top) ────────────────────────────────
  pdf.setFillColor(...accent);
  pdf.rect(0, 0, 210, 3, "F");

  // ── HEADER ────────────────────────────────────────────────────────────────
  let leftY = y;
  let rightY = y;

  // Left: business info
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  dark();
  pdf.text(data.businessName, L, leftY);
  leftY += 7;

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
  if (data.businessPhone) {
    gray();
    pdf.text(`Ph: ${data.businessPhone}`, L, leftY);
    leftY += LINE_H;
  }
  if (data.businessEmail) {
    gray();
    pdf.text(data.businessEmail, L, leftY);
    leftY += LINE_H;
  }

  // Right: invoice meta — "TAX INVOICE" large, colored, right-aligned
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  accentC();
  pdf.text(data.type.toUpperCase(), R, rightY, { align: "right" });
  rightY += 9;

  pdf.setFontSize(8.5);
  dark();
  pdf.setFont("helvetica", "bold");
  pdf.text(`Invoice No: ${data.invoiceNumber}`, R, rightY, { align: "right" });
  rightY += LINE_H + 0.5;

  pdf.setFont("helvetica", "normal");
  gray();
  pdf.text(`Date: ${format(data.date, "dd MMM yyyy")}`, R, rightY, { align: "right" });
  rightY += LINE_H;
  pdf.text(`Due:  ${format(data.dueDate, "dd MMM yyyy")}`, R, rightY, { align: "right" });
  rightY += LINE_H;

  y = Math.max(leftY, rightY) + 6;
  hLine(y, accent);  // indigo divider under header
  y += 7;

  // ── BILL TO ───────────────────────────────────────────────────────────────
  checkPage(25);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  accentC();
  pdf.text("BILL TO", L, y);
  y += 5;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
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
  if (data.customer.state)  { pdf.text(data.customer.state, L, y);                y += LINE_H; }
  if (data.customer.phone)  { pdf.text(`Ph: ${data.customer.phone}`, L, y);       y += LINE_H; }
  if (data.customer.email)  { pdf.text(data.customer.email, L, y);                y += LINE_H; }

  y += 5;
  hLine(y);
  y += 7;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  // Total width = 182mm (R - L = 196 - 14 = 182)
  // #(7) Item(55) HSN(18) Qty(12) Rate(28) GST%(13) Tax(22) Total(27) = 182 ✓
  const C = {
    num:   { x: 14,  w: 7,   label: "#",     align: "center" as const },
    item:  { x: 21,  w: 55,  label: "Item",  align: "left"   as const },
    hsn:   { x: 76,  w: 18,  label: "HSN",   align: "center" as const },
    qty:   { x: 94,  w: 12,  label: "Qty",   align: "right"  as const },
    rate:  { x: 106, w: 28,  label: "Rate",  align: "right"  as const },
    gst:   { x: 134, w: 13,  label: "GST%",  align: "center" as const },
    tax:   { x: 147, w: 22,  label: "Tax",   align: "right"  as const },
    total: { x: 169, w: 27,  label: "Total", align: "right"  as const },
  };

  const cellX = (col: { x: number; w: number; align: "left" | "center" | "right" }) =>
    col.align === "right"   ? col.x + col.w
    : col.align === "center" ? col.x + col.w / 2
    : col.x + 1.5;

  const TH = 7;
  const ROW = 6.5;

  const drawTableHeader = () => {
    pdf.setFillColor(245, 245, 245);
    pdf.rect(L, y, R - L, TH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    dark();
    for (const col of Object.values(C)) {
      pdf.text(col.label, cellX(col), y + 4.8, { align: col.align });
    }
    y += TH;
    hLine(y);
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

    if (idx % 2 === 1) {
      pdf.setFillColor(250, 250, 251);
      pdf.rect(L, y, R - L, ROW, "F");
    }

    const tax   = calcItemTax(item);
    const total = calcItemTaxable(item) + tax;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    dark();

    const nameText = pdf.splitTextToSize(item.name, C.item.w - 2)[0];
    pdf.text(String(idx + 1),             cellX(C.num),   y + 4.2, { align: C.num.align });
    pdf.text(nameText,                    cellX(C.item),  y + 4.2, { align: C.item.align });
    pdf.text(item.hsn || "—",            cellX(C.hsn),   y + 4.2, { align: C.hsn.align });
    pdf.text(`${item.qty} ${item.unit}`,  cellX(C.qty),   y + 4.2, { align: C.qty.align });
    pdf.text(fmtAmt(item.rate),           cellX(C.rate),  y + 4.2, { align: C.rate.align });
    pdf.text(`${item.gstPercent}%`,       cellX(C.gst),   y + 4.2, { align: C.gst.align });
    pdf.text(fmtAmt(tax),                 cellX(C.tax),   y + 4.2, { align: C.tax.align });
    pdf.text(fmtAmt(total),               cellX(C.total), y + 4.2, { align: C.total.align });

    y += ROW;
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.2);
    pdf.line(L, y, R, y);
  });

  y += 7;

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  checkPage(40);

  const summaryRow = (label: string, amount: number, bold = false, useIndigo = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 9 : 8.5);
    if (useIndigo) {
      accentC();
    } else {
      if (bold) {
        dark();
      } else {
        gray();
      }
    }
    pdf.text(label, R - 72, y);
    if (useIndigo) {
      accentC();
    } else {
      dark();
    }
    pdf.text(fmtAmt(amount), R, y, { align: "right" });
    y += 5.5;
  };

  summaryRow("Subtotal", totals.subtotal);
  if (totals.isIntraState) {
    summaryRow("CGST", totals.cgst);
    summaryRow("SGST", totals.sgst);
  } else {
    summaryRow("IGST", totals.igst);
  }

  hLine(y - 1, accent);
  y += 4;

  // Grand Total: 14pt, indigo, bold
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  accentC();
  pdf.text("Grand Total", R - 72, y);
  pdf.text(fmtAmt(totals.grandTotal), R, y, { align: "right" });
  y += 8;

  // ── AMOUNT IN WORDS ───────────────────────────────────────────────────────
  checkPage(10);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  gray();
  pdf.text(numberToWords(totals.grandTotal), L, y);
  y += 9;

  // ── BANK DETAILS ──────────────────────────────────────────────────────────
  const showUpiQR = isPro() && !!data.upiId && totals.grandTotal > 0;
  if (data.bankName || data.accountNumber || data.upiId || showUpiQR) {
    checkPage(30);
    hLine(y);
    y += 6;
    const bankStartY = y; // remember top of bank section for QR positioning

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    dark();
    pdf.text("Bank Details", L, y);
    y += 5.5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    gray();
    if (data.bankName)      { pdf.text(`Bank: ${data.bankName}`,              L, y); y += LINE_H; }
    if (data.accountNumber) { pdf.text(`Account No: ${data.accountNumber}`,   L, y); y += LINE_H; }
    if (data.ifsc)          { pdf.text(`IFSC: ${data.ifsc}`,                  L, y); y += LINE_H; }
    if (data.upiId)         { pdf.text(`UPI ID: ${data.upiId}`,               L, y); y += LINE_H; }

    if (showUpiQR) {
      const upiUrl = `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.businessName || "Business")}&am=${totals.grandTotal}&cu=INR&tn=Invoice-${data.invoiceNumber}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(upiUrl, { width: 80, margin: 1 });
        const qrSize = 24; // mm
        const qrX = R - qrSize;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        dark();
        pdf.text("Scan to Pay", qrX + qrSize / 2, bankStartY, { align: "center" });
        pdf.addImage(qrDataUrl, "PNG", qrX, bankStartY + 2, qrSize, qrSize);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        gray();
        pdf.text(data.upiId!, qrX + qrSize / 2, bankStartY + qrSize + 5, { align: "center" });
        // ensure y accounts for QR height
        y = Math.max(y, bankStartY + qrSize + 8);
      } catch {
        // QR generation failed silently
      }
    }
    y += 5;
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if ((data.notes || "").trim()) {
    checkPage(16);
    hLine(y);
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    dark();
    pdf.text("Notes", L, y);
    y += 5.5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    gray();
    const noteLines = pdf.splitTextToSize(data.notes, R - L);
    pdf.text(noteLines, L, y);
    y += noteLines.length * LINE_H + 5;
  }

  // ── TERMS ─────────────────────────────────────────────────────────────────
  if ((data.terms || "").trim()) {
    checkPage(16);
    hLine(y);
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    dark();
    pdf.text("Terms & Conditions", L, y);
    y += 5.5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    gray();
    const termLines = pdf.splitTextToSize(data.terms, R - L);
    pdf.text(termLines, L, y);
    y += termLines.length * LINE_H + 5;
  }

  // ── FOOTER (all pages) ────────────────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    // Footer indigo bar
    pdf.setFillColor(...accent);
    pdf.rect(0, 294, 210, 3, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(156, 163, 175);
    pdf.text("Generated by BillKar", 105, 291, { align: "center" });
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
