import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Package, Upload, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { getCurrentPlan, getProductLimit, canWrite } from "@/lib/planStore";
import UpgradeModal from "@/components/UpgradeModal";
import { api } from "@/lib/api";
import { normalizeCSVHeader, parseCSV } from "@/lib/csv";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["pcs", "kg", "ltr", "mtr", "box", "nos", "hrs"];

interface Product {
  id: string;
  name: string;
  hsn: string;
  type: string;
  unit: string;
  price: number;
  gst: number;
  stock: number;
  lowStock: number;
}

type ApiProductRecord = {
  id: string;
  name: string;
  hsn_sac_code?: string;
  type?: string;
  unit?: string;
  selling_price?: number | string;
  gst_rate?: number | string;
  stock_quantity?: number | string;
  low_stock_threshold?: number | string;
};

type ProductForm = {
  name: string;
  hsn: string;
  type: string;
  unit: string;
  price: string;
  purchasePrice: string;
  gst: string;
  stock: string;
  lowStock: string;
};

const emptyForm = { name: "", hsn: "", type: "Goods", unit: "pcs", price: "", purchasePrice: "", gst: "18", stock: "", lowStock: "" };
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-border animate-pulse">
    <div className="h-4 w-28 bg-muted rounded" />
    <div className="h-4 w-16 bg-muted rounded" />
    <div className="h-5 w-14 bg-muted rounded-full" />
    <div className="h-4 w-10 bg-muted rounded" />
    <div className="h-4 w-14 bg-muted rounded ml-auto" />
    <div className="h-4 w-10 bg-muted rounded" />
    <div className="h-4 w-12 bg-muted rounded" />
  </div>
);

const Products = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isFree = getCurrentPlan() === "free";
  const limit = getProductLimit();

  const fetchProducts = async () => {
    try {
      const { products } = await api.getProducts();
      setProducts(((products || []) as ApiProductRecord[]).map((p) => ({
        id: p.id,
        name: p.name,
        hsn: p.hsn_sac_code || "",
        type: p.type === "service" ? "Service" : "Goods",
        unit: p.unit || "pcs",
        price: Number(p.selling_price) || 0,
        gst: Number(p.gst_rate) || 18,
        stock: p.stock_quantity || 0,
        lowStock: p.low_stock_threshold || 10,
      })));
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.hsn.includes(q));
  }, [search, products]);

  const updateForm = (field: keyof ProductForm, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const isLowStock = (p: Product) => p.type === "Goods" && p.lowStock > 0 && p.stock <= p.lowStock;

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
      const hsnIdx   = headers.findIndex((h) => h === "hsn");
      const typeIdx  = headers.findIndex((h) => h === "type");
      const unitIdx  = headers.findIndex((h) => h === "unit");
      const priceIdx = headers.findIndex((h) => h === "price");
      const gstIdx   = headers.findIndex((h) => h.includes("gst"));

      if (nameIdx === -1) throw new Error("CSV must have a 'Name' column");

      const importRows = rows.slice(1).map((cols) => {
        const typeVal = typeIdx >= 0 ? cols[typeIdx].toLowerCase() : "goods";
        return {
          name:          cols[nameIdx] || "",
          hsn_sac_code:  hsnIdx  >= 0 ? cols[hsnIdx]   : "",
          type:          typeVal.includes("service") ? "service" : "goods",
          unit:          unitIdx >= 0 ? cols[unitIdx]  : "pcs",
          selling_price: priceIdx >= 0 ? Number(cols[priceIdx]) || 0 : 0,
          gst_rate:      gstIdx  >= 0 ? Number(cols[gstIdx])   || 18 : 18,
        };
      }).filter((r) => r.name);

      if (importRows.length === 0) throw new Error("No valid rows found in CSV");
      if (isFree && products.length + importRows.length > limit) {
        throw new Error(`Import would exceed your product limit (${limit}). Upgrade or import fewer rows.`);
      }

      for (const row of importRows) {
        await api.createProduct(row);
      }

      toast.success(`${importRows.length} product${importRows.length !== 1 ? "s" : ""} imported successfully`);
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, "CSV import failed"));
    } finally {
      setImporting(false);
    }
  };

  const handleAddClick = () => {
    if (isFree && products.length >= limit) {
      setUpgradeOpen(true);
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setSlideOpen(true);
  };

  const handleEditClick = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      hsn: p.hsn,
      type: p.type,
      unit: p.unit,
      price: String(p.price),
      purchasePrice: "",
      gst: String(p.gst),
      stock: String(p.stock),
      lowStock: String(p.lowStock),
    });
    setSlideOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name || saving) return;
    setSaving(true);
    const payload = {
      name: form.name,
      hsn_sac_code: form.hsn,
      type: form.type.toLowerCase(),
      unit: form.unit,
      selling_price: Number(form.price) || 0,
      purchase_price: Number(form.purchasePrice) || 0,
      gst_rate: Number(form.gst),
      stock_quantity: Number(form.stock) || 0,
      low_stock_threshold: Number(form.lowStock) || 10,
    };
    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
        setProducts((prev) => prev.map((p) => p.id === editingId ? {
          ...p,
          name: form.name,
          hsn: form.hsn,
          type: form.type.toLowerCase() === "service" ? "Service" : "Goods",
          unit: form.unit,
          price: Number(form.price) || 0,
          gst: Number(form.gst) || 18,
          stock: Number(form.stock) || 0,
          lowStock: Number(form.lowStock) || 10,
        } : p));
        toast.success("Product updated successfully");
      } else {
        const res = await api.createProduct(payload);
        const data = (res.product ?? res) as ApiProductRecord;
        setProducts((prev) => [{
          id: data.id,
          name: data.name || form.name,
          hsn: data.hsn_sac_code || form.hsn || "",
          type: (data.type || form.type).toLowerCase() === "service" ? "Service" : "Goods",
          unit: data.unit || form.unit,
          price: Number(data.selling_price) || Number(form.price) || 0,
          gst: Number(data.gst_rate) || Number(form.gst) || 18,
          stock: Number(data.stock_quantity) || Number(form.stock) || 0,
          lowStock: Number(data.low_stock_threshold) || Number(form.lowStock) || 10,
        }, ...prev]);
        toast.success("Product added successfully");
      }
      setEditingId(null);
      setForm(emptyForm);
      setSlideOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, editingId ? "Failed to update product" : "Failed to add product"));
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
              Products & Services {isFree && <span className="text-sm font-medium text-muted-foreground">({products.length}/{limit})</span>}
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
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
                  <Plus size={16} /> Add Product
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative max-w-xs mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {loading ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="hidden md:block">
              <div className="flex items-center gap-4 px-5 py-3 border-b border-border">
                {["w-20", "w-16", "w-12", "w-10", "w-14", "w-10", "w-12"].map((w, i) => (
                  <div key={i} className={`h-3 ${w} bg-muted rounded`} />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
            <div className="md:hidden divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="flex justify-between"><div className="h-4 w-32 bg-muted rounded" /><div className="h-4 w-14 bg-muted rounded" /></div>
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-background rounded-2xl border border-border shadow-sm p-12 text-center">
            <Package size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-bold mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add products to speed up invoice creation.</p>
            {canWrite() && (
              <button onClick={() => { setForm(emptyForm); setSlideOpen(true); }}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus size={16} /> Add Product
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
                    <th className="text-left py-3 px-4 font-medium">HSN/SAC</th>
                    <th className="text-center py-3 px-4 font-medium">Type</th>
                    <th className="text-center py-3 px-4 font-medium">Unit</th>
                    <th className="text-right py-3 px-4 font-medium">Price</th>
                    <th className="text-center py-3 px-4 font-medium">GST</th>
                    <th className="text-right py-3 px-5 font-medium">Stock</th>
                    <th className="py-3 px-4 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className={cn("border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer", isLowStock(p) && "bg-amber-50")}>
                      <td className="py-3 px-5 font-medium">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.hsn || "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                          p.type === "Goods" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>{p.type}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{p.unit}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmt(p.price)}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{p.gst}%</td>
                      <td className="py-3 px-5 text-right">
                        {p.type === "Service" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cn("font-semibold", isLowStock(p) && "text-amber-600")}>
                            {p.stock}{isLowStock(p) && " ⚠"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleEditClick(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit product">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {filtered.map((p) => (
                <div key={p.id} className={cn("p-4", isLowStock(p) && "bg-amber-50")}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-medium text-sm">{p.name}</span>
                      <span className={cn("ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        p.type === "Goods" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>{p.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{fmt(p.price)}</span>
                      <button onClick={() => handleEditClick(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>HSN: {p.hsn || "—"} · {p.gst}% GST</span>
                    {p.type === "Goods" && (
                      <span className={cn(isLowStock(p) && "text-amber-600 font-semibold")}>
                        Stock: {p.stock}{isLowStock(p) && " ⚠"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Product Slide-over */}
      <AnimatePresence>
        {slideOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => { setSlideOpen(false); setEditingId(null); }} className="fixed inset-0 bg-foreground z-40" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-bold">{editingId ? "Edit Product" : "Add Product"}</h2>
                <button onClick={() => { setSlideOpen(false); setEditingId(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Product Name *</label>
                  <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. Wireless Mouse"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">HSN / SAC Code</label>
                  <input value={form.hsn} onChange={(e) => updateForm("hsn", e.target.value)} placeholder="e.g. 8471"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
                  <div className="flex gap-2">
                    {["Goods", "Service"].map((t) => (
                      <button key={t} onClick={() => updateForm("type", t)}
                        className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                          form.type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit</label>
                  <select value={form.unit} onChange={(e) => updateForm("unit", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Selling Price (₹)</label>
                    <input type="number" value={form.price} onChange={(e) => updateForm("price", e.target.value)} placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Purchase Price (₹)</label>
                    <input type="number" value={form.purchasePrice} onChange={(e) => updateForm("purchasePrice", e.target.value)} placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">GST Rate</label>
                  <select value={form.gst} onChange={(e) => updateForm("gst", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                {form.type === "Goods" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Stock Qty</label>
                      <input type="number" value={form.stock} onChange={(e) => updateForm("stock", e.target.value)} placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Low Stock Alert</label>
                      <input type="number" value={form.lowStock} onChange={(e) => updateForm("lowStock", e.target.value)} placeholder="e.g. 10"
                        className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                )}
                <button onClick={handleSaveProduct} disabled={saving}
                  className="w-full bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-2 disabled:opacity-70">
                  {saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
};

export default Products;
