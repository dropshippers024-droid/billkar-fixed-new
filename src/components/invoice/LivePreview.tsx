import { useMemo } from "react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import type { InvoiceData } from "./types";
import { calcItemTaxable, calcItemTax, calcItemTotal, isIntraState, formatCurrency, numberToWords } from "./utils";
import { isPro, canUseUpiQr } from "@/lib/planStore";

interface Props {
  data: InvoiceData;
}

/* ── Type helpers ────────────────────────────────── */

function getTypeConfig(type: string) {
  const isEstimate   = type === "Estimate";
  const isCreditNote = type === "Credit Note";
  const isChallan    = type === "Delivery Challan";
  const isProforma   = type === "Proforma Invoice";
  const showGST      = !isEstimate && !isChallan;
  const dueDateLabel = isEstimate ? "Valid Until" : "Due";
  return { isEstimate, isCreditNote, isChallan, isProforma, showGST, dueDateLabel };
}

/* ── Shared data helpers ─────────────────────────── */

const useInvoiceTotals = (data: InvoiceData) => {
  const { items, customer } = data;
  const intra = isIntraState(data.businessState, customer.state);
  const typeConfig = getTypeConfig(data.type);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
    const tax = typeConfig.showGST ? items.reduce((s, i) => s + calcItemTax(i), 0) : 0;
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [items, typeConfig.showGST]);

  const validItems = items.filter((i) => i.name);

  return { intra, totals, validItems, customer, typeConfig };
};

/* ── MODERN ──────────────────────────────────────── */

const ModernTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 space-y-5 text-xs">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-gray-500 font-mono text-[10px]">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-500 mt-0.5">{data.businessAddress}</p>}
            {data.businessState && <p className="text-gray-500">{data.businessState}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-indigo-600 uppercase">{data.type}</p>
            <p className="text-gray-500 mt-1">#{data.invoiceNumber}</p>
            <p className="text-gray-500">Date: {format(data.date, "dd MMM yyyy")}</p>
            <p className="text-gray-500">{dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Credit Note details */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-[10px]">
            {data.originalInvoiceNumber && <p className="text-gray-600">Original Invoice: <span className="font-semibold">#{data.originalInvoiceNumber}</span></p>}
            {data.creditReason && <p className="text-gray-600">Reason: <span className="font-semibold">{data.creditReason}</span></p>}
          </div>
        )}

        {/* Delivery Challan transport details */}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-[10px]">
            {data.vehicleNumber && <p className="text-gray-600">Vehicle No: <span className="font-semibold">{data.vehicleNumber}</span></p>}
            {data.transportDetails && <p className="text-gray-600">Transport: <span className="font-semibold">{data.transportDetails}</span></p>}
          </div>
        )}

        {/* Bill To */}
        {customer.name && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">Bill To</p>
            <p className="font-bold text-sm text-gray-900">{customer.name}</p>
            {customer.gstin && <p className="font-mono text-[10px] text-gray-500">GSTIN: {customer.gstin}</p>}
            {customer.address && <p className="text-gray-500">{customer.address}</p>}
            {customer.state && <p className="text-gray-500">{customer.state}</p>}
            {customer.phone && <p className="text-gray-500">Ph: {customer.phone}</p>}
          </div>
        )}

        {/* Items */}
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium rounded-l">#</th>
              <th className="text-left py-2 px-2 font-medium">Item</th>
              <th className="text-center py-2 px-2 font-medium">Qty</th>
              <th className="text-right py-2 px-2 font-medium">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 px-2 font-medium">CGST</th>
                  <th className="text-right py-2 px-2 font-medium">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 px-2 font-medium">IGST</th>
              ))}
              <th className="text-right py-2 px-2 font-medium rounded-r">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-400">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700">{item.qty} {item.unit}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax / 2)}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2 px-2 text-right font-semibold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-48 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span className="text-gray-700">{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span className="text-gray-700">{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-500">IGST</span><span className="text-gray-700">{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-extrabold text-sm text-indigo-600">
              <span>{isCreditNote ? "Credit Amount" : "Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-400">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {/* Disclaimers */}
        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-400 text-center border-t border-gray-100 pt-3">
            {isProforma ? "This is not a demand for payment. Final invoice will follow." : "This credit note is issued against the original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-gray-200" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── CLASSIC ─────────────────────────────────────── */

const ClassicTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden">
      {/* Dark header bar */}
      <div className="bg-gray-800 text-white p-4 rounded-t-xl">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-extrabold">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-gray-300 font-mono text-[10px]">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-300 text-xs mt-0.5">{data.businessAddress}</p>}
            {data.businessState && <p className="text-gray-300 text-xs">{data.businessState}</p>}
          </div>
          <p className="text-lg font-extrabold tracking-wide uppercase">{data.type}</p>
        </div>
      </div>

      {/* Date strip */}
      <div className="bg-gray-100 px-4 py-2 flex justify-between text-xs text-gray-600 border-b border-gray-300">
        <span>#{data.invoiceNumber}</span>
        <span>Date: {format(data.date, "dd MMM yyyy")} &nbsp;|&nbsp; {dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</span>
      </div>

      <div className="p-5 space-y-5 text-xs">
        {/* Credit Note / Challan extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="border-l-4 border-red-400 pl-3 py-1">
            {data.originalInvoiceNumber && <p className="text-gray-600">Original Invoice: <span className="font-semibold">#{data.originalInvoiceNumber}</span></p>}
            {data.creditReason && <p className="text-gray-600">Reason: <span className="font-semibold">{data.creditReason}</span></p>}
          </div>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="border-l-4 border-gray-400 pl-3 py-1">
            {data.vehicleNumber && <p className="text-gray-600">Vehicle: <span className="font-semibold">{data.vehicleNumber}</span></p>}
            {data.transportDetails && <p className="text-gray-600">Transport: <span className="font-semibold">{data.transportDetails}</span></p>}
          </div>
        )}

        {/* Bill To - left border style */}
        {customer.name && (
          <div className="border-l-4 border-gray-400 pl-3 py-1">
            <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">Bill To</p>
            <p className="font-bold text-sm text-gray-900">{customer.name}</p>
            {customer.gstin && <p className="font-mono text-[10px] text-gray-500">GSTIN: {customer.gstin}</p>}
            {customer.address && <p className="text-gray-500">{customer.address}</p>}
            {customer.state && <p className="text-gray-500">{customer.state}</p>}
            {customer.phone && <p className="text-gray-500">Ph: {customer.phone}</p>}
          </div>
        )}

        {/* Items - strong borders */}
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="border-b-2 border-gray-300 text-[10px] text-gray-600 uppercase bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold border-r border-gray-200">#</th>
              <th className="text-left py-2 px-2 font-semibold border-r border-gray-200">Item</th>
              <th className="text-center py-2 px-2 font-semibold border-r border-gray-200">Qty</th>
              <th className="text-right py-2 px-2 font-semibold border-r border-gray-200">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 px-2 font-semibold border-r border-gray-200">CGST</th>
                  <th className="text-right py-2 px-2 font-semibold border-r border-gray-200">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 px-2 font-semibold border-r border-gray-200">IGST</th>
              ))}
              <th className="text-right py-2 px-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-2 px-2 text-gray-400 border-r border-gray-200">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-gray-200">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-400">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700 border-r border-gray-200">{item.qty} {item.unit}</td>
                  <td className="py-2 px-2 text-right text-gray-700 border-r border-gray-200">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2 px-2 text-right text-gray-500 border-r border-gray-200">{formatCurrency(tax / 2)}</td>
                      <td className="py-2 px-2 text-right text-gray-500 border-r border-gray-200">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2 px-2 text-right text-gray-500 border-r border-gray-200">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2 px-2 text-right font-semibold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary - gray box */}
        <div className="flex justify-end">
          <div className="w-52 bg-gray-100 rounded-lg p-3 space-y-1.5 text-xs border border-gray-200">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-gray-300 pt-1.5 font-extrabold text-sm text-gray-900">
              <span>{isCreditNote ? "Credit Amount" : "Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-400">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-400 text-center border-t border-gray-200 pt-3">
            {isProforma ? "This is not a demand for payment. Final invoice will follow." : "This credit note is issued against the original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-gray-300" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── MINIMAL ─────────────────────────────────────── */

const MinimalTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-8 space-y-6 text-xs">
        {/* Header - simple text */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-gray-400 font-mono text-[10px]">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-400 mt-0.5">{data.businessAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{data.type}</p>
            <p className="text-gray-400 mt-2">#{data.invoiceNumber}</p>
            <p className="text-gray-400">{format(data.date, "dd MMM yyyy")}</p>
            <p className="text-gray-400">{dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Type-specific extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="text-[10px] text-gray-500 space-y-0.5">
            {data.originalInvoiceNumber && <p>Original Invoice: #{data.originalInvoiceNumber}</p>}
            {data.creditReason && <p>Reason: {data.creditReason}</p>}
          </div>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="text-[10px] text-gray-500 space-y-0.5">
            {data.vehicleNumber && <p>Vehicle: {data.vehicleNumber}</p>}
            {data.transportDetails && <p>Transport: {data.transportDetails}</p>}
          </div>
        )}

        {/* Bill To - no card, just text */}
        {customer.name && (
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Bill To</p>
            <p className="font-medium text-sm text-gray-900">{customer.name}</p>
            {customer.gstin && <p className="font-mono text-[10px] text-gray-400">GSTIN: {customer.gstin}</p>}
            {customer.address && <p className="text-gray-400">{customer.address}</p>}
            {customer.state && <p className="text-gray-400">{customer.state}</p>}
          </div>
        )}

        {/* Items - hairline, no header bg */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-[10px] text-gray-400 uppercase tracking-wider">
              <th className="text-left py-2 font-normal">#</th>
              <th className="text-left py-2 font-normal">Item</th>
              <th className="text-center py-2 font-normal">Qty</th>
              <th className="text-right py-2 font-normal">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 font-normal">CGST</th>
                  <th className="text-right py-2 font-normal">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 font-normal">IGST</th>
              ))}
              <th className="text-right py-2 font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-300">{idx + 1}</td>
                  <td className="py-2.5">
                    <p className="text-gray-800">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-300">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2.5 text-center text-gray-500">{item.qty} {item.unit}</td>
                  <td className="py-2.5 text-right text-gray-500">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2.5 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                      <td className="py-2.5 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2.5 text-right text-gray-400">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2.5 text-right text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary - simple, no accent */}
        <div className="flex justify-end">
          <div className="w-48 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-gray-700">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-400">CGST</span><span className="text-gray-500">{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">SGST</span><span className="text-gray-500">{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-400">IGST</span><span className="text-gray-500">{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-extrabold text-base text-gray-900">
              <span>{isCreditNote ? "Credit Amount" : "Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-300">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-300 text-center border-t border-gray-100 pt-3">
            {isProforma ? "This is not a demand for payment." : "This credit note is issued against the original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-gray-100" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── BOLD ────────────────────────────────────────── */

const BoldTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 space-y-5 text-xs">
        {/* Header with red left border */}
        <div className="flex justify-between items-start">
          <div className="border-l-8 border-red-600 pl-3">
            <h3 className="text-sm font-extrabold text-gray-900">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-gray-500 font-mono text-[10px]">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-500 mt-0.5">{data.businessAddress}</p>}
            {data.businessState && <p className="text-gray-500">{data.businessState}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-red-600 uppercase tracking-tight">{data.type}</p>
            <p className="text-gray-500 mt-1 font-semibold">#{data.invoiceNumber}</p>
            <p className="text-gray-500">Date: {format(data.date, "dd MMM yyyy")}</p>
            <p className="text-gray-500">{dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Type-specific extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-[10px]">
            {data.originalInvoiceNumber && <p className="text-gray-600 font-semibold">Original Invoice: #{data.originalInvoiceNumber}</p>}
            {data.creditReason && <p className="text-gray-600">Reason: {data.creditReason}</p>}
          </div>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-[10px]">
            {data.vehicleNumber && <p className="text-gray-600">Vehicle: <span className="font-semibold">{data.vehicleNumber}</span></p>}
            {data.transportDetails && <p className="text-gray-600">Transport: <span className="font-semibold">{data.transportDetails}</span></p>}
          </div>
        )}

        {/* Bill To */}
        {customer.name && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Bill To</p>
            <p className="font-bold text-sm text-gray-900">{customer.name}</p>
            {customer.gstin && <p className="font-mono text-[10px] text-gray-500">GSTIN: {customer.gstin}</p>}
            {customer.address && <p className="text-gray-500">{customer.address}</p>}
            {customer.state && <p className="text-gray-500">{customer.state}</p>}
            {customer.phone && <p className="text-gray-500">Ph: {customer.phone}</p>}
          </div>
        )}

        {/* Items - red header */}
        <table className="w-full">
          <thead>
            <tr className="bg-red-600 text-white text-[10px] uppercase">
              <th className="text-left py-2 px-2 font-semibold rounded-l">#</th>
              <th className="text-left py-2 px-2 font-semibold">Item</th>
              <th className="text-center py-2 px-2 font-semibold">Qty</th>
              <th className="text-right py-2 px-2 font-semibold">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 px-2 font-semibold">CGST</th>
                  <th className="text-right py-2 px-2 font-semibold">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 px-2 font-semibold">IGST</th>
              ))}
              <th className="text-right py-2 px-2 font-semibold rounded-r">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-2 text-gray-400 font-bold">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-400">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700 font-semibold">{item.qty} {item.unit}</td>
                  <td className="py-2 px-2 text-right text-gray-700 font-semibold">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax / 2)}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2 px-2 text-right font-extrabold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary - red accent */}
        <div className="flex justify-end">
          <div className="w-52 bg-red-50 rounded-lg p-3 space-y-1.5 text-xs border border-red-100">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold text-gray-900">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span className="font-semibold">{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span className="font-semibold">{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-500">IGST</span><span className="font-semibold">{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-red-200 pt-2 font-extrabold text-base text-red-600">
              <span>{isCreditNote ? "Credit Amount" : "Grand Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-400">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-400 text-center border-t border-gray-100 pt-3">
            {isProforma ? "This is not a demand for payment. Final invoice will follow." : "This credit note is issued against the original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-gray-200" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── PROFESSIONAL ────────────────────────────────── */

const ProfessionalTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Top emerald bar */}
      <div className="bg-emerald-700 text-white px-5 py-3.5 flex justify-between items-center">
        <h3 className="text-sm font-extrabold">{data.businessName || "Your Business"}</h3>
        <p className="text-sm font-bold uppercase tracking-wide">{data.type}</p>
      </div>

      <div className="p-5 space-y-5 text-xs">
        {/* Two columns: Invoice details left, Bill To right */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase font-semibold text-emerald-700 mb-1.5">Invoice Details</p>
            <p className="text-gray-600">Invoice #: <span className="font-semibold text-gray-900">{data.invoiceNumber}</span></p>
            <p className="text-gray-600">Date: {format(data.date, "dd MMM yyyy")}</p>
            <p className="text-gray-600">{dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</p>
            {data.businessGstin && <p className="text-gray-500 font-mono text-[10px] mt-1">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-500">{data.businessAddress}, {data.businessState}</p>}
          </div>
          {customer.name && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-emerald-700 mb-1.5">Bill To</p>
              <p className="font-bold text-sm text-gray-900">{customer.name}</p>
              {customer.gstin && <p className="font-mono text-[10px] text-gray-500">GSTIN: {customer.gstin}</p>}
              {customer.address && <p className="text-gray-500">{customer.address}</p>}
              {customer.state && <p className="text-gray-500">{customer.state}</p>}
              {customer.phone && <p className="text-gray-500">Ph: {customer.phone}</p>}
            </div>
          )}
        </div>

        {/* Type-specific extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-[10px]">
            {data.originalInvoiceNumber && <p className="text-gray-600">Original Invoice: <span className="font-semibold">#{data.originalInvoiceNumber}</span></p>}
            {data.creditReason && <p className="text-gray-600">Reason: <span className="font-semibold">{data.creditReason}</span></p>}
          </div>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-[10px]">
            {data.vehicleNumber && <p className="text-gray-600">Vehicle: <span className="font-semibold">{data.vehicleNumber}</span></p>}
            {data.transportDetails && <p className="text-gray-600">Transport: <span className="font-semibold">{data.transportDetails}</span></p>}
          </div>
        )}

        {/* Items - emerald header */}
        <table className="w-full">
          <thead>
            <tr className="bg-emerald-50 text-emerald-800 text-[10px] uppercase">
              <th className="text-left py-2 px-2 font-semibold rounded-l">#</th>
              <th className="text-left py-2 px-2 font-semibold">Item</th>
              <th className="text-center py-2 px-2 font-semibold">Qty</th>
              <th className="text-right py-2 px-2 font-semibold">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 px-2 font-semibold">CGST</th>
                  <th className="text-right py-2 px-2 font-semibold">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 px-2 font-semibold">IGST</th>
              ))}
              <th className="text-right py-2 px-2 font-semibold rounded-r">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-400">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700">{item.qty} {item.unit}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax / 2)}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2 px-2 text-right font-semibold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary - emerald box */}
        <div className="flex justify-end">
          <div className="w-52 bg-emerald-50 rounded-lg p-3 space-y-1.5 text-xs border border-emerald-100">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-extrabold text-sm text-emerald-700">
              <span>{isCreditNote ? "Credit Amount" : "Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-400">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-400 text-center">
            {isProforma ? "This is not a demand for payment. Final invoice will follow." : "This credit note is issued against the original invoice."}
          </p>
        )}

        {/* Footer with emerald accent */}
        <div className="border-t-2 border-emerald-600 pt-4 space-y-3">
          {(data.bankName || data.accountNumber || data.ifsc || (isPro() && data.upiId)) && (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[10px] uppercase font-semibold text-emerald-700 mb-0.5">Bank Details</p>
                {data.bankName && <p className="text-gray-500">Bank: {data.bankName}</p>}
                <p className="text-gray-500">
                  {data.accountNumber && <>A/C No: {data.accountNumber}</>}
                  {data.accountNumber && data.ifsc && <> | </>}
                  {data.ifsc && <>IFSC: {data.ifsc}</>}
                </p>
                {data.upiId && <p className="text-gray-500">UPI: {data.upiId}</p>}
              </div>
              {canUseUpiQr() && data.upiId && totals.grandTotal > 0 && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Scan to Pay</p>
                  <QRCodeSVG value={`upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.businessName || "Business")}&am=${totals.grandTotal}&cu=INR&tn=Invoice-${data.invoiceNumber}`} size={72} />
                  <p className="text-[8px] text-gray-400">{data.upiId}</p>
                </div>
              )}
            </div>
          )}
          {data.notes && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-emerald-700 mb-0.5">Notes</p>
              <p className="text-gray-500">{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-emerald-700 mb-0.5">Terms & Conditions</p>
              <p className="text-gray-500 whitespace-pre-line">{data.terms}</p>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <div className="text-center">
              <div className="w-32 border-b border-emerald-300 mb-1" />
              <p className="text-[10px] text-gray-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Shared Footer (for Modern/Classic/Minimal/Bold) ── */

const FooterSection = ({ data, accentBorder, grandTotal }: { data: InvoiceData; accentBorder: string; grandTotal?: number }) => {
  const hasBank = data.bankName || data.accountNumber || data.ifsc;
  const showQR = canUseUpiQr() && !!data.upiId && !!grandTotal;
  const upiUrl = showQR
    ? `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.businessName || "Business")}&am=${grandTotal}&cu=INR&tn=Invoice-${data.invoiceNumber}`
    : "";
  return (
    <div className={`border-t ${accentBorder} pt-4 space-y-3`}>
      {(hasBank || showQR) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {hasBank && (
              <>
                <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Bank Details</p>
                {data.bankName && <p className="text-gray-500">Bank: {data.bankName}</p>}
                <p className="text-gray-500">
                  {data.accountNumber && <>A/C No: {data.accountNumber}</>}
                  {data.accountNumber && data.ifsc && <> | </>}
                  {data.ifsc && <>IFSC: {data.ifsc}</>}
                </p>
                {data.upiId && <p className="text-gray-500">UPI: {data.upiId}</p>}
              </>
            )}
          </div>
          {showQR && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Scan to Pay</p>
              <QRCodeSVG value={upiUrl} size={72} />
              <p className="text-[8px] text-gray-400">{data.upiId}</p>
            </div>
          )}
        </div>
      )}
      {data.notes && (
        <div>
          <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Notes</p>
          <p className="text-gray-500">{data.notes}</p>
        </div>
      )}
      {data.terms && (
        <div>
          <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Terms & Conditions</p>
          <p className="text-gray-500 whitespace-pre-line">{data.terms}</p>
        </div>
      )}
      <div className="flex justify-end pt-4">
        <div className="text-center">
          <div className={`w-32 border-b ${accentBorder} mb-1`} />
          <p className="text-[10px] text-gray-400">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
};

/* ── ELEGANT ─────────────────────────────────────── */

const ElegantTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-violet-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-7 space-y-5 text-xs">
        {/* Header: violet underline accent */}
        <div className="flex justify-between items-start pb-4 border-b-2 border-violet-200">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-gray-400 font-mono text-[10px] mt-0.5">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-400 mt-0.5">{data.businessAddress}</p>}
            {data.businessState && <p className="text-gray-400">{data.businessState}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest mb-1">{data.type}</p>
            <p className="text-gray-400">#{data.invoiceNumber}</p>
            <p className="text-gray-400">Date: {format(data.date, "dd MMM yyyy")}</p>
            <p className="text-gray-400">{dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Type extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="bg-violet-50 rounded-lg p-3 border border-violet-100 text-[10px]">
            {data.originalInvoiceNumber && <p className="text-gray-600">Original Invoice: <span className="font-semibold">#{data.originalInvoiceNumber}</span></p>}
            {data.creditReason && <p className="text-gray-600">Reason: <span className="font-semibold">{data.creditReason}</span></p>}
          </div>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="bg-violet-50 rounded-lg p-3 border border-violet-100 text-[10px]">
            {data.vehicleNumber && <p className="text-gray-600">Vehicle: <span className="font-semibold">{data.vehicleNumber}</span></p>}
            {data.transportDetails && <p className="text-gray-600">Transport: <span className="font-semibold">{data.transportDetails}</span></p>}
          </div>
        )}

        {/* Bill To */}
        {customer.name && (
          <div className="pl-3 border-l-2 border-violet-300 py-1">
            <p className="text-[10px] uppercase font-semibold text-violet-400 tracking-widest mb-1">Bill To</p>
            <p className="font-extrabold text-sm text-gray-900">{customer.name}</p>
            {customer.gstin && <p className="font-mono text-[10px] text-gray-400">GSTIN: {customer.gstin}</p>}
            {customer.address && <p className="text-gray-400 mt-0.5">{customer.address}</p>}
            {customer.state && <p className="text-gray-400">{customer.state}</p>}
            {customer.phone && <p className="text-gray-400">Ph: {customer.phone}</p>}
          </div>
        )}

        {/* Items */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-t border-violet-100 text-[10px] text-violet-500 uppercase tracking-wider">
              <th className="text-left py-2 px-1 font-semibold">#</th>
              <th className="text-left py-2 px-1 font-semibold">Item</th>
              <th className="text-center py-2 px-1 font-semibold">Qty</th>
              <th className="text-right py-2 px-1 font-semibold">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 px-1 font-semibold">CGST</th>
                  <th className="text-right py-2 px-1 font-semibold">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 px-1 font-semibold">IGST</th>
              ))}
              <th className="text-right py-2 px-1 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-violet-50 last:border-0">
                  <td className="py-2.5 px-1 text-gray-300">{idx + 1}</td>
                  <td className="py-2.5 px-1">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-300">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2.5 px-1 text-center text-gray-600">{item.qty} {item.unit}</td>
                  <td className="py-2.5 px-1 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2.5 px-1 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                      <td className="py-2.5 px-1 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2.5 px-1 text-right text-gray-400">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2.5 px-1 text-right font-bold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-48 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-gray-700">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-400">CGST</span><span className="text-gray-500">{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">SGST</span><span className="text-gray-500">{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-400">IGST</span><span className="text-gray-500">{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t-2 border-violet-200 pt-2 font-extrabold text-sm text-violet-700">
              <span>{isCreditNote ? "Credit Amount" : "Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-300">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-400 text-center border-t border-violet-100 pt-3">
            {isProforma ? "This is not a demand for payment. Final invoice will follow." : "This credit note is issued against the original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-violet-100" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── STARTUP ─────────────────────────────────────── */

const StartupTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Blue header block */}
      <div className="bg-blue-600 text-white px-5 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-extrabold">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-blue-200 font-mono text-[10px] mt-0.5">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-blue-200 text-[10px] mt-0.5">{data.businessAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold uppercase tracking-widest text-blue-100">{data.type}</p>
            <p className="text-blue-200 mt-1 text-[10px]">#{data.invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Date strip */}
      <div className="bg-blue-50 px-5 py-2 flex justify-between text-[10px] text-blue-700 border-b border-blue-100">
        <span>Date: {format(data.date, "dd MMM yyyy")}</span>
        <span>{dueDateLabel}: {format(data.dueDate, "dd MMM yyyy")}</span>
      </div>

      <div className="p-5 space-y-4 text-xs">
        {/* Type extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-[10px]">
            {data.originalInvoiceNumber && <p className="text-gray-600 font-semibold">Original Invoice: #{data.originalInvoiceNumber}</p>}
            {data.creditReason && <p className="text-gray-600">Reason: {data.creditReason}</p>}
          </div>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-[10px]">
            {data.vehicleNumber && <p className="text-gray-600">Vehicle: <span className="font-semibold">{data.vehicleNumber}</span></p>}
            {data.transportDetails && <p className="text-gray-600">Transport: <span className="font-semibold">{data.transportDetails}</span></p>}
          </div>
        )}

        {/* Bill To */}
        {customer.name && (
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] uppercase font-bold text-blue-600 mb-1 tracking-wider">Bill To</p>
            <p className="font-bold text-sm text-gray-900">{customer.name}</p>
            {customer.gstin && <p className="font-mono text-[10px] text-gray-500">GSTIN: {customer.gstin}</p>}
            {customer.address && <p className="text-gray-500">{customer.address}</p>}
            {customer.state && <p className="text-gray-500">{customer.state}</p>}
            {customer.phone && <p className="text-gray-500">Ph: {customer.phone}</p>}
          </div>
        )}

        {/* Items */}
        <table className="w-full">
          <thead>
            <tr className="bg-blue-600 text-white text-[10px] uppercase">
              <th className="text-left py-2 px-2 font-semibold rounded-l">#</th>
              <th className="text-left py-2 px-2 font-semibold">Item</th>
              <th className="text-center py-2 px-2 font-semibold">Qty</th>
              <th className="text-right py-2 px-2 font-semibold">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-2 px-2 font-semibold">CGST</th>
                  <th className="text-right py-2 px-2 font-semibold">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 px-2 font-semibold">IGST</th>
              ))}
              <th className="text-right py-2 px-2 font-semibold rounded-r">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {item.hsn && <p className="text-[10px] text-gray-400">HSN: {item.hsn}</p>}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-600">{item.qty} {item.unit}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-2 px-2 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                      <td className="py-2 px-2 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-2 px-2 text-right text-gray-400">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-2 px-2 text-right font-bold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-48 bg-blue-50 rounded-xl p-3 space-y-1.5 text-xs border border-blue-100">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-800">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-blue-200 pt-1.5 font-extrabold text-sm text-blue-700">
              <span>{isCreditNote ? "Credit Amount" : "Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
            <p className="text-[10px] italic text-gray-400">{numberToWords(totals.grandTotal)}</p>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[10px] italic text-gray-400 text-center border-t border-gray-100 pt-3">
            {isProforma ? "This is not a demand for payment. Final invoice will follow." : "This credit note is issued against the original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-blue-100" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── COMPACT ─────────────────────────────────────── */

const CompactTemplate = ({ data }: Props) => {
  const { intra, totals, validItems, customer, typeConfig } = useInvoiceTotals(data);
  const { showGST, dueDateLabel, isCreditNote, isChallan, isProforma } = typeConfig;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 space-y-3 text-[10px]">
        {/* Header: tight, all on one line */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-xs font-extrabold text-gray-900">{data.businessName || "Your Business"}</h3>
            {data.businessGstin && <p className="text-gray-400 font-mono">GSTIN: {data.businessGstin}</p>}
            {data.businessAddress && <p className="text-gray-400">{data.businessAddress}{data.businessState ? `, ${data.businessState}` : ""}</p>}
          </div>
          <div className="text-right">
            <p className="font-extrabold text-gray-700 uppercase text-[9px] tracking-widest">{data.type}</p>
            <p className="text-gray-500 font-semibold">#{data.invoiceNumber}</p>
            <p className="text-gray-400">{format(data.date, "dd/MM/yy")} — {dueDateLabel}: {format(data.dueDate, "dd/MM/yy")}</p>
          </div>
        </div>

        {/* Type extras */}
        {isCreditNote && (data.originalInvoiceNumber || data.creditReason) && (
          <p className="text-gray-500">
            {data.originalInvoiceNumber && <>Orig. Inv: #{data.originalInvoiceNumber}</>}
            {data.creditReason && <> | Reason: {data.creditReason}</>}
          </p>
        )}
        {isChallan && (data.vehicleNumber || data.transportDetails) && (
          <p className="text-gray-500">
            {data.vehicleNumber && <>Vehicle: {data.vehicleNumber}</>}
            {data.transportDetails && <> | {data.transportDetails}</>}
          </p>
        )}

        {/* Bill To: inline compact */}
        {customer.name && (
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-2.5">
            <div>
              <span className="text-[9px] uppercase font-semibold text-gray-400 mr-1">To:</span>
              <span className="font-bold text-gray-900">{customer.name}</span>
              {customer.gstin && <span className="ml-2 text-gray-400 font-mono">GSTIN: {customer.gstin}</span>}
              {customer.address && <p className="text-gray-400 mt-0.5">{customer.address}{customer.state ? `, ${customer.state}` : ""}</p>}
            </div>
          </div>
        )}

        {/* Items — dense table */}
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-600 text-[9px] text-gray-600 uppercase">
              <th className="text-left py-1 pr-1 font-semibold">#</th>
              <th className="text-left py-1 font-semibold">Item</th>
              <th className="text-center py-1 px-1 font-semibold">Qty</th>
              <th className="text-right py-1 px-1 font-semibold">Rate</th>
              {showGST && (intra ? (
                <>
                  <th className="text-right py-1 px-1 font-semibold">CGST</th>
                  <th className="text-right py-1 px-1 font-semibold">SGST</th>
                </>
              ) : (
                <th className="text-right py-1 px-1 font-semibold">IGST</th>
              ))}
              <th className="text-right py-1 pl-1 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => {
              const tax = calcItemTax(item);
              return (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-1 text-gray-400">{idx + 1}</td>
                  <td className="py-1.5 text-gray-800">
                    {item.name}
                    {item.hsn && <span className="ml-1 text-gray-400">[{item.hsn}]</span>}
                  </td>
                  <td className="py-1.5 px-1 text-center text-gray-600">{item.qty} {item.unit}</td>
                  <td className="py-1.5 px-1 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                  {showGST && (intra ? (
                    <>
                      <td className="py-1.5 px-1 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                      <td className="py-1.5 px-1 text-right text-gray-400">{formatCurrency(tax / 2)}</td>
                    </>
                  ) : (
                    <td className="py-1.5 px-1 text-right text-gray-400">{formatCurrency(tax)}</td>
                  ))}
                  <td className="py-1.5 pl-1 text-right font-bold text-gray-900">{formatCurrency(calcItemTotal(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary: inline compact */}
        <div className="flex justify-end">
          <div className="w-44 space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-gray-700">{formatCurrency(totals.subtotal)}</span></div>
            {showGST && (intra ? (
              <>
                <div className="flex justify-between"><span className="text-gray-400">CGST</span><span className="text-gray-500">{formatCurrency(totals.tax / 2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">SGST</span><span className="text-gray-500">{formatCurrency(totals.tax / 2)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-gray-400">IGST</span><span className="text-gray-500">{formatCurrency(totals.tax)}</span></div>
            ))}
            <div className="flex justify-between border-t border-gray-600 pt-1 font-extrabold text-xs text-gray-800">
              <span>{isCreditNote ? "Credit Amt" : "Grand Total"}</span><span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        {(isProforma || isCreditNote) && (
          <p className="text-[9px] italic text-gray-400 text-center border-t border-gray-100 pt-2">
            {isProforma ? "This is not a demand for payment." : "Credit note issued against original invoice."}
          </p>
        )}

        <FooterSection data={data} accentBorder="border-gray-200" grandTotal={totals.grandTotal} />
      </div>
    </div>
  );
};

/* ── Main component ──────────────────────────────── */

const templateMap: Record<string, React.FC<Props>> = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  bold: BoldTemplate,
  professional: ProfessionalTemplate,
  elegant: ElegantTemplate,
  startup: StartupTemplate,
  compact: CompactTemplate,
};

const LivePreview = ({ data }: Props) => {
  const Template = templateMap[data.template] || ModernTemplate;
  const showUpiTip = !data.upiId;
  return (
    <div>
      <Template data={data} />
      {showUpiTip && (
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
          <span className="text-base leading-none mt-0.5">💳</span>
          <span>Add your <strong>UPI ID</strong> in Settings → Business to show a scannable QR code on this invoice — customers can pay instantly by scanning it. <strong>It's free!</strong></span>
        </div>
      )}
    </div>
  );
};

export default LivePreview;