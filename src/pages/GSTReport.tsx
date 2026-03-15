import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Lock, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { canExportGSTR } from "@/lib/planStore";
import UpgradeModal from "@/components/UpgradeModal";
import { api } from "@/lib/api";
import { getBusinessProfile } from "@/lib/businessStore";
import { toast } from "sonner";

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) =>
  "₹" + r2(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const months: string[] = [];
for (let i = 0; i < 6; i++) {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  months.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
}

function parsePeriod(monthYear: string): { start: string; end: string } {
  const [month, year] = monthYear.split(" ");
  const m = MONTH_NAMES.indexOf(month);
  const y = parseInt(year);
  const start = new Date(y, m, 1);
  const end   = new Date(y, m + 1, 1);
  return {
    start: start.toISOString().split("T")[0],
    end:   end.toISOString().split("T")[0],
  };
}

interface GstRate {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

interface GstSummary {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  byRate: GstRate[];
}

type GstInvoice = {
  id: string;
  invoice_number?: string;
  invoice_date: string;
  total_amount?: number | string;
  status?: string;
  taxable_amount?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  is_inter_state?: boolean;
  customer_gstin?: string;
};

type GstItem = {
  invoice_id: string;
  gst_percent?: number | string;
  taxable_amount?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  quantity?: number | string;
  rate?: number | string;
};

type BusinessRecord = {
  gstin?: string;
};

const SkeletonTableRow = ({ cols }: { cols: number }) => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-border animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-4 w-20 bg-muted rounded" />
    ))}
  </div>
);
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const GSTReport = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(months[0]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [summary, setSummary] = useState<GstSummary>({
    taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, byRate: [],
  });

  const fetchData = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    try {
      if (!api.isLoggedIn()) { setLoading(false); return; }

      const { start, end } = parsePeriod(selectedPeriod);

      // Fetch all invoices and filter client-side by date range and status
      const { invoices: rawInvoices } = await api.getInvoices();
      const invoices = ((rawInvoices || []) as GstInvoice[]).filter((inv) =>
        inv.invoice_date >= start &&
        inv.invoice_date <= end &&
        !["cancelled", "draft"].includes(String(inv.status || "").toLowerCase())
      );

      if (invoices.length === 0) {
        setSummary({ taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, byRate: [] });
        setLoading(false);
        return;
      }

      // SUM stored invoice-level columns for summary cards
      let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
      for (const inv of invoices) {
        totalTaxable += Number(inv.taxable_amount) || 0;
        totalCgst    += Number(inv.cgst) || 0;
        totalSgst    += Number(inv.sgst) || 0;
        totalIgst    += Number(inv.igst) || 0;
      }

      // Fetch line items for each invoice via API
      const interStateIds = new Set(
        invoices.filter((i) => i.is_inter_state).map((i) => i.id)
      );

      const itemResults = await Promise.all(
        invoices.map((inv) => api.getInvoiceItems(inv.id).catch(() => [] as GstItem[]))
      );
      const items = itemResults.flat() as GstItem[];

      // Group by gst_percent for rate breakup
      const rateMap = new Map<number, GstRate>();
      for (const item of items) {
        const gstRate = Number(item.gst_percent) || 0;

        // Use stored values if available; otherwise calculate from qty x rate
        let taxable = Number(item.taxable_amount) || 0;
        let cgst    = Number(item.cgst) || 0;
        let sgst    = Number(item.sgst) || 0;
        let igst    = Number(item.igst) || 0;

        // Fallback: if stored values are all zero and we have qty/rate, recalculate
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        if (taxable === 0 && qty > 0 && rate > 0) {
          taxable = qty * rate;
          const tax = taxable * gstRate / 100;
          const isInter = interStateIds.has(item.invoice_id);
          cgst = isInter ? 0 : r2(tax / 2);
          sgst = isInter ? 0 : r2(tax / 2);
          igst = isInter ? r2(tax) : 0;
        }

        const existing = rateMap.get(gstRate) || { rate: gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        rateMap.set(gstRate, {
          rate:    gstRate,
          taxable: existing.taxable + taxable,
          cgst:    existing.cgst + cgst,
          sgst:    existing.sgst + sgst,
          igst:    existing.igst + igst,
          total:   existing.total + cgst + sgst + igst,
        });
      }

      // If invoice-level totals are all zero (old data), sum up from items
      if (totalTaxable === 0 && items.length > 0) {
        for (const [, r] of rateMap) {
          totalTaxable += r.taxable;
          totalCgst    += r.cgst;
          totalSgst    += r.sgst;
          totalIgst    += r.igst;
        }
      }

      const byRate = Array.from(rateMap.values())
        .filter((r) => r.taxable > 0 || r.total > 0)
        .sort((a, b) => a.rate - b.rate);

      setSummary({
        taxable:  totalTaxable,
        cgst:     totalCgst,
        sgst:     totalSgst,
        igst:     totalIgst,
        totalGst: totalCgst + totalSgst + totalIgst,
        byRate,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const handleDownload = async () => {
    if (!canExportGSTR()) {
      setUpgradeOpen(true);
      return;
    }

    try {
      if (!api.isLoggedIn()) { toast.error("Not logged in"); return; }

      let business: BusinessRecord | undefined;
      try {
        const businessResponse = await api.getBusiness();
        business = businessResponse.business as BusinessRecord | undefined;
      } catch {
        toast.error("Business profile not found"); return;
      }

      const { start, end } = parsePeriod(period);

      const { invoices: rawInvoices } = await api.getInvoices();
      const invoices = ((rawInvoices || []) as GstInvoice[]).filter((inv) =>
        inv.invoice_date >= start &&
        inv.invoice_date <= end &&
        !["cancelled", "draft"].includes(String(inv.status || "").toLowerCase())
      );


      if (invoices.length === 0) {
        toast.error("No invoices found for " + period);
        return;
      }

      // Fetch items for each invoice
      const itemResults = await Promise.all(
        invoices.map((inv) => api.getInvoiceItems(inv.id).catch(() => [] as GstItem[]))
      );
      const items = itemResults.flat() as GstItem[];

      const itemsByInvoice = new Map<string, NonNullable<typeof items>>();
      for (const item of items || []) {
        if (!itemsByInvoice.has(item.invoice_id)) itemsByInvoice.set(item.invoice_id, []);
        itemsByInvoice.get(item.invoice_id)!.push(item);
      }

      const b2b: object[] = [];
      const b2csMap = new Map<number, number>();

      for (const inv of invoices) {
        const invItems = itemsByInvoice.get(inv.id) || [];
        const itms = invItems.map((it) => {
          const txval = r2(Number(it.quantity) * Number(it.rate));
          const gst   = Number(it.gst_percent) || 0;
          return {
            num: 1,
            itm_det: {
              rt:   gst,
              txval,
              camt: inv.is_inter_state ? 0 : r2(txval * gst / 200),
              samt: inv.is_inter_state ? 0 : r2(txval * gst / 200),
              iamt: inv.is_inter_state ? r2(txval * gst / 100) : 0,
            },
          };
        });

        if (inv.customer_gstin) {
          b2b.push({
            ctin: inv.customer_gstin,
            inv: [{
              inum: inv.invoice_number,
              idt:  inv.invoice_date,
              val:  r2(Number(inv.total_amount)),
              pos:  "29",
              rchrg: "N",
              inv_typ: "R",
              itms,
            }],
          });
        } else {
          for (const it of invItems) {
            const gst    = Number(it.gst_percent) || 0;
            const txval  = r2(Number(it.quantity) * Number(it.rate));
            b2csMap.set(gst, r2((b2csMap.get(gst) || 0) + txval));
          }
        }
      }

      const b2cs = Array.from(b2csMap.entries()).map(([rt, txval]) => ({
        sply_tp: "INTRA",
        rt,
        txval,
        camt: r2(txval * rt / 200),
        samt: r2(txval * rt / 200),
      }));

      const [mName, yr] = period.split(" ");
      const m = String(MONTH_NAMES.indexOf(mName) + 1).padStart(2, "0");
      const fp = `${m}${yr}`;
      const profile = getBusinessProfile();

      const gstr1 = { gstin: business.gstin || profile.gstin || "", fp, b2b, b2cs };

      const blob = new Blob([JSON.stringify(gstr1, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `GSTR1_${mName}_${yr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("GSTR-1 JSON downloaded successfully");
    } catch (err) {
      console.error("GSTR-1 download error:", err);
      toast.error("Download failed: " + getErrorMessage(err, "Unknown error"));
    }
  };

  const handleExportExcel = () => {
    if (!canExportGSTR()) { setUpgradeOpen(true); return; }
    const fmtNum = (n: number) => r2(n).toFixed(2);
    const rows: (string | number)[][] = [
      ["GST Report - " + period],
      [],
      ["Summary"],
      ["Taxable Value", fmtNum(summary.taxable)],
      ["CGST",         fmtNum(summary.cgst)],
      ["SGST",         fmtNum(summary.sgst)],
      ["IGST",         fmtNum(summary.igst)],
      ["Total GST",    fmtNum(summary.totalGst)],
      [],
      ["Tax Rate Breakup"],
      ["Rate (%)", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"],
      ...summary.byRate.map((r) => [
        r.rate + "%",
        fmtNum(r.taxable),
        fmtNum(r.cgst),
        fmtNum(r.sgst),
        fmtNum(r.igst),
        fmtNum(r.total),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `GSTReport_${period.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("GST Report exported");
  };

  const summaryCards = [
    { label: "Taxable Value", value: summary.taxable },
    { label: "CGST",         value: summary.cgst },
    { label: "SGST",         value: summary.sgst },
    { label: "IGST",         value: summary.igst },
    { label: "Total GST",    value: summary.totalGst },
  ];

  return (
    <DashboardShell>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="gstr_export" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-extrabold">GST Report</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
            >
              {canExportGSTR() ? <FileSpreadsheet size={15} /> : <Lock size={15} />} Export Excel
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              {canExportGSTR() ? <Download size={16} /> : <Lock size={16} />} Download GSTR-1 JSON
            </button>
          </div>
        </div>

        {/* Period */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setPeriod(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                period === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
            {[6, 3].map((cols, ti) => (
              <div key={ti} className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border"><div className="h-4 w-48 bg-muted rounded animate-pulse" /></div>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={cols} />)}
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {summaryCards.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-background rounded-2xl border border-border shadow-sm p-4"
                >
                  <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-lg font-extrabold mt-1">{fmt(s.value)}</p>
                </motion.div>
              ))}
            </div>

            {/* GST Rate Breakup */}
            <div className="bg-background rounded-2xl border border-border shadow-sm">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-sm">Tax Rate Breakup</h3>
              </div>
              {summary.byRate.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No invoice data for {period}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50 text-muted-foreground">
                        <th className="text-left py-2.5 px-5 font-medium">Rate</th>
                        <th className="text-right py-2.5 px-4 font-medium">Taxable Value</th>
                        <th className="text-right py-2.5 px-4 font-medium">CGST</th>
                        <th className="text-right py-2.5 px-4 font-medium">SGST</th>
                        <th className="text-right py-2.5 px-4 font-medium">IGST</th>
                        <th className="text-right py-2.5 px-5 font-medium">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byRate.map((r) => (
                        <tr key={r.rate} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="py-2.5 px-5 font-semibold">{r.rate}%</td>
                          <td className="py-2.5 px-4 text-right">{fmt(r.taxable)}</td>
                          <td className="py-2.5 px-4 text-right">{fmt(r.cgst)}</td>
                          <td className="py-2.5 px-4 text-right">{fmt(r.sgst)}</td>
                          <td className="py-2.5 px-4 text-right">{fmt(r.igst)}</td>
                          <td className="py-2.5 px-5 text-right font-semibold">{fmt(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Overall summary */}
            {summary.byRate.length > 0 && (
              <div className="bg-background rounded-2xl border border-border shadow-sm">
                <div className="p-5 border-b border-border">
                  <h3 className="font-bold text-sm">Overall Summary — {period}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { label: "Total Taxable Value", value: summary.taxable },
                        { label: "Total CGST",          value: summary.cgst },
                        { label: "Total SGST",          value: summary.sgst },
                        { label: "Total IGST",          value: summary.igst },
                        { label: "Total GST Liability", value: summary.totalGst },
                      ].map((row, i, arr) => (
                        <tr
                          key={row.label}
                          className={cn(
                            "border-b border-border hover:bg-secondary/50 transition-colors",
                            i === arr.length - 1 && "last:border-0 bg-primary/5 font-bold"
                          )}
                        >
                          <td className="py-2.5 px-5">{row.label}</td>
                          <td className="py-2.5 px-5 text-right font-semibold">{fmt(row.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </DashboardShell>
  );
};

export default GSTReport;
