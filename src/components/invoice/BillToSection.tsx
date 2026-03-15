import { useState, useEffect } from "react";
import { Plus, Search, Check, Loader2 } from "lucide-react";
import { INDIAN_STATES, type CustomerInfo } from "./types";
import CollapsibleSection from "./CollapsibleSection";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DbCustomer {
  id?: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  billing_address: string;
  state: string;
}

interface Props {
  customer: CustomerInfo;
  onChange: (customer: CustomerInfo) => void;
}

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const BillToSection = ({ customer, onChange }: Props) => {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [dbCustomers, setDbCustomers] = useState<DbCustomer[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { customers } = await api.getCustomers();
        if (customers) {
          setDbCustomers(customers.map((c: Record<string, unknown>): DbCustomer => ({
            id: (c.id as string) ?? "",
            name: (c.name as string) ?? "",
            gstin: (c.gstin as string) ?? "",
            phone: (c.phone as string) ?? "",
            email: (c.email as string) ?? "",
            billing_address: (c.billing_address as string) ?? "",
            state: (c.state as string) ?? "",
          })));
        }
      } catch {
        // silently fail
      }
    };
    load();
  }, []);

  const filtered = search.length > 0
    ? dbCustomers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const selectCustomer = (c: DbCustomer) => {
    onChange({
      id: c.id || "",
      name: c.name,
      gstin: c.gstin || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.billing_address || "",
      state: c.state || "",
    });
    setSearch("");
    setShowNew(false);
    setSaved(true);
  };

  const updateField = (field: keyof CustomerInfo, value: string) => {
    onChange({ ...customer, [field]: value });
    setSaved(false);
  };

  const handleSaveCustomer = async () => {
    if (!customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setSaving(true);
    try {
      const response = await api.createCustomer({
        name: customer.name.trim(),
        phone: customer.phone || "",
        email: customer.email || "",
        gstin: customer.gstin || "",
        billing_address: customer.address || "",
        state: customer.state || "",
      });
      const savedCustomer = (response.customer ?? response) as { id?: string };
      onChange({ ...customer, id: savedCustomer.id || customer.id || "" });
      // Add to local list so it shows in search next time
      setDbCustomers((prev) => [...prev, {
        id: savedCustomer.id,
        name: customer.name.trim(),
        gstin: customer.gstin || "",
        phone: customer.phone || "",
        email: customer.email || "",
        billing_address: customer.address || "",
        state: customer.state || "",
      }]);
      setSaved(true);
      setShowNew(false);
      toast.success("Customer saved");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save customer"));
    } finally {
      setSaving(false);
    }
  };

  const isExistingCustomer = customer.name && dbCustomers.some(
    (c) => c.name.toLowerCase() === customer.name.toLowerCase()
  );

  return (
    <CollapsibleSection title="Bill To">
      {/* Search existing */}
      {!showNew && !customer.name && (
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search existing customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {filtered.map((c) => (
                <button key={c.name + c.gstin} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.gstin || c.phone || c.state}</p>
                </button>
              ))}
            </div>
          )}
          {search.length > 1 && filtered.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10">
              <button onClick={() => { setShowNew(true); setSearch(""); onChange({ ...customer, id: "", name: search }); setSaved(false); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center gap-2">
                <Plus size={14} className="text-accent" />
                <span>Add "<span className="font-medium">{search}</span>" as new customer</span>
              </button>
            </div>
          )}
        </div>
      )}

      {!showNew && !customer.name && (
        <button onClick={() => { setShowNew(true); setSaved(false); }} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <Plus size={14} /> New Customer
        </button>
      )}

      {(showNew || customer.name) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name *</label>
              <input value={customer.name} onChange={(e) => updateField("name", e.target.value)}
                placeholder="Business or person name"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">GSTIN</label>
              <input value={customer.gstin} onChange={(e) => updateField("gstin", e.target.value.toUpperCase().slice(0, 15))}
                placeholder="15-char GSTIN" maxLength={15}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono ${customer.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(customer.gstin) ? "border-destructive" : "border-border"}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
              <input value={customer.phone} onChange={(e) => updateField("phone", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                Email
                <span className="font-normal opacity-60">(needed to send invoice by email)</span>
              </label>
              <input value={customer.email} onChange={(e) => updateField("email", e.target.value)}
                placeholder="customer@example.com" type="email"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
              <input value={customer.address} onChange={(e) => updateField("address", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">State *</label>
              <select value={customer.state} onChange={(e) => updateField("state", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Customer button — only for new customers */}
            {customer.name && !isExistingCustomer && !saved && (
              <button
                onClick={handleSaveCustomer}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving...</>
                ) : (
                  <><Plus size={14} /> Save Customer</>
                )}
              </button>
            )}
            {saved && customer.name && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <Check size={14} /> Customer saved
              </span>
            )}
            {customer.name && (
              <button onClick={() => { onChange({ id: "", name: "", gstin: "", phone: "", email: "", address: "", state: "" }); setShowNew(false); setSaved(false); }}
                className="text-xs text-destructive hover:underline">Clear customer</button>
            )}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default BillToSection;
