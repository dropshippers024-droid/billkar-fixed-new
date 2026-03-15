import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Users, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { INDIAN_STATES } from "@/components/invoice/types";
import { toast } from "sonner";
import { getCurrentPlan, getCustomerLimit, canWrite } from "@/lib/planStore";
import UpgradeModal from "@/components/UpgradeModal";
import { api } from "@/lib/api";
import { normalizeCSVHeader, parseCSV } from "@/lib/csv";

interface Customer {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  balance: number;
}

type ApiCustomerRecord = {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
  email?: string;
  billing_address?: string;
  state?: string;
  balance_due?: number | string;
};

type CustomerForm = {
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
};

type CustomerFormField = {
  label: string;
  field: keyof CustomerForm;
  placeholder: string;
  maxLen?: number;
  mono?: boolean;
};

const emptyForm = { name: "", gstin: "", phone: "", email: "", address: "", state: "" };
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
const CUSTOMER_FIELDS: CustomerFormField[] = [
  { label: "Customer Name *", field: "name", placeholder: "Business or person name" },
  { label: "GSTIN", field: "gstin", placeholder: "15-character GSTIN", maxLen: 15, mono: true },
  { label: "Phone", field: "phone", placeholder: "10-digit mobile" },
  { label: "Email", field: "email", placeholder: "email@example.com" },
  { label: "Address", field: "address", placeholder: "Full address" },
];

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-border animate-pulse">
    <div className="h-4 w-28 bg-muted rounded" />
    <div className="h-4 w-32 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-32 bg-muted rounded" />
    <div className="h-4 w-20 bg-muted rounded" />
    <div className="h-4 w-16 bg-muted rounded ml-auto" />
  </div>
);

const Customers = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isFree = getCurrentPlan() === "free";
  const limit = getCustomerLimit();

  const fetchCustomers = async () => {
    try {
      const { customers } = await api.getCustomers();
      setCustomers(((customers || []) as ApiCustomerRecord[]).map((c) => ({
        id: c.id,
        name: c.name,
        gstin: c.gstin || "",
        phone: c.phone || "",
        email: c.email || "",
        address: c.billing_address || "",
        state: c.state || "",
        balance: Number(c.balance_due) || 0,
      })));
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.gstin || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  }, [search, customers]);

  const updateForm = (field: keyof CustomerForm, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV must have a header row and at least one data row");

      const headers = rows[0].map(normalizeCSVHeader);
      const nameIdx  = headers.findIndex((h) => h === "name");
      const gstinIdx = headers.findIndex((h) => h === "gstin");
      const phoneIdx = headers.findIndex((h) => h === "phone");
      const emailIdx = headers.findIndex((h) => h === "email");
      const addrIdx  = headers.findIndex((h) => h === "address");
      const stateIdx = headers.findIndex((h) => h === "state");

      if (nameIdx === -1) throw new Error("CSV must have a 'Name' column");

      const importRows = rows.slice(1).map((cols) => {
        return {
          name:            cols[nameIdx]  || "",
          gstin:           gstinIdx >= 0 ? cols[gstinIdx]  : "",
          phone:           phoneIdx >= 0 ? cols[phoneIdx]  : "",
          email:           emailIdx >= 0 ? cols[emailIdx]  : "",
          billing_address: addrIdx  >= 0 ? cols[addrIdx]   : "",
          state:           stateIdx >= 0 ? cols[stateIdx]  : "",
        };
      }).filter((r) => r.name);

      if (importRows.length === 0) throw new Error("No valid rows found in CSV");
      if (isFree && customers.length + importRows.length > limit) {
        throw new Error(`Import would exceed your customer limit (${limit}). Upgrade or import fewer rows.`);
      }

      for (const row of importRows) {
        await api.createCustomer(row);
      }

      toast.success(`${importRows.length} customer${importRows.length !== 1 ? "s" : ""} imported successfully`);
      fetchCustomers();
    } catch (err) {
      toast.error(getErrorMessage(err, "CSV import failed"));
    } finally {
      setImporting(false);
    }
  };

  const handleAddClick = () => {
    if (isFree && customers.length >= limit) {
      setUpgradeOpen(true);
      return;
    }
    setForm(emptyForm);
    setSlideOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!form.name || saving) return;
    setSaving(true);
    try {
      const data = await api.createCustomer({
        name: form.name,
        gstin: form.gstin,
        phone: form.phone,
        email: form.email,
        billing_address: form.address,
        state: form.state,
      });
      const customer = (data.customer ?? data) as ApiCustomerRecord;

      setCustomers((prev) => [{
        id: customer.id,
        name: customer.name || form.name,
        gstin: customer.gstin || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.billing_address || "",
        state: customer.state || "",
        balance: 0,
      }, ...prev]);
      setForm(emptyForm);
      setSlideOpen(false);
      toast.success("Customer added successfully");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to add customer"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="invoice_limit" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-extrabold">
              Customers {isFree && <span className="text-sm font-medium text-muted-foreground">({customers.length}/{limit})</span>}
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
            {canWrite() && (
              <>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                  <Upload size={15} /> {importing ? "Importing..." : "Import CSV"}
                </button>
                <button onClick={handleAddClick}
                  className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
                  <Plus size={16} /> Add Customer
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative max-w-xs mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {loading ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block">
              <div className="flex items-center gap-4 px-5 py-3 border-b border-border">
                {["w-20", "w-24", "w-16", "w-24", "w-16", "w-16"].map((w, i) => (
                  <div key={i} className={`h-3 ${w} bg-muted rounded`} />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
            <div className="md:hidden divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="flex justify-between"><div className="h-4 w-32 bg-muted rounded" /><div className="h-4 w-16 bg-muted rounded" /></div>
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-bold mb-1">No customers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first customer to start invoicing.</p>
            {canWrite() && (
              <button onClick={() => { setForm(emptyForm); setSlideOpen(true); }}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus size={16} /> Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-5 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">GSTIN</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">State</th>
                    <th className="text-right py-3 px-5 font-medium">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => setDetail(c)} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="py-3 px-5 font-medium">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{c.gstin || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.email || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.state || "—"}</td>
                      <td className={cn("py-3 px-5 text-right font-semibold", c.balance > 0 ? "text-amber-600" : "text-accent")}>
                        {c.balance > 0 ? fmt(c.balance) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {filtered.map((c) => (
                <div key={c.id} onClick={() => setDetail(c)} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className={cn("text-sm font-semibold", c.balance > 0 ? "text-amber-600" : "text-accent")}>
                      {c.balance > 0 ? fmt(c.balance) : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.phone} · {c.state}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Customer Slide-over */}
      <AnimatePresence>
        {slideOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setSlideOpen(false)} className="fixed inset-0 bg-foreground z-40" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-bold">Add Customer</h2>
                <button onClick={() => setSlideOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                {CUSTOMER_FIELDS.map((f) => (
                  <div key={f.field}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                    <input value={form[f.field]} onChange={(e) => updateForm(f.field, f.field === "gstin" ? e.target.value.toUpperCase().slice(0, 15) : e.target.value)}
                      placeholder={f.placeholder} maxLength={f.maxLen}
                      className={cn("w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20", f.mono && "font-mono")} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">State *</label>
                  <select value={form.state} onChange={(e) => updateForm("state", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={handleSaveCustomer} disabled={saving}
                  className="w-full bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-2 disabled:opacity-70">
                  {saving ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer Detail Slide-over */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setDetail(null)} className="fixed inset-0 bg-foreground z-40" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[50%] bg-background border-l border-border z-50 overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-bold">{detail.name}</h2>
                <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "GSTIN", value: detail.gstin || "—" },
                    { label: "Phone", value: detail.phone || "—" },
                    { label: "Email", value: detail.email || "—" },
                    { label: "State", value: detail.state || "—" },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{f.value}</p>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{detail.address || "—"}</p>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance Due</span>
                  <span className={cn("text-xl font-extrabold", detail.balance > 0 ? "text-amber-600" : "text-accent")}>
                    {detail.balance > 0 ? fmt(detail.balance) : "₹0"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold mb-3">Invoice History</h3>
                  <p className="text-sm text-muted-foreground">Invoice history will appear here once invoices are created.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
};

export default Customers;
