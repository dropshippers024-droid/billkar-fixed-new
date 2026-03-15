import { Plus, Trash2, GripVertical } from "lucide-react";
import { type InvoiceItem, UNITS, GST_RATES, emptyItem } from "./types";
import { calcItemTax, calcItemTotal, formatCurrency } from "./utils";
import CollapsibleSection from "./CollapsibleSection";

interface Props {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
}

const ItemsSection = ({ items, onChange }: Props) => {
  const updateItem = (id: string, field: keyof InvoiceItem, value: InvoiceItem[keyof InvoiceItem]) => {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    onChange(items.filter((i) => i.id !== id));
  };

  const addItem = () => onChange([...items, emptyItem()]);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const dragIdx = Number(e.dataTransfer.getData("text/plain"));
    if (dragIdx === dropIdx) return;
    const copy = [...items];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(dropIdx, 0, moved);
    onChange(copy);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
  const labelCls = "text-[10px] font-medium text-muted-foreground mb-1 block uppercase tracking-wide";

  return (
    <CollapsibleSection title="Items">
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, idx)}
            className="rounded-xl border border-border bg-background p-4"
          >
            {/* Top row: drag handle + item number + trash */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="cursor-grab text-muted-foreground hover:text-foreground transition-colors">
                  <GripVertical size={16} />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                disabled={items.length <= 1}
                className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Row 1: Name (full width) */}
            <div className="mb-3">
              <label className={labelCls}>Item Name</label>
              <input
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                placeholder="Item or service name"
                className={inputCls}
              />
            </div>

            {/* Row 2: Qty/Unit + Rate (+ HSN on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className={labelCls}>Qty & Unit</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))}
                    className="w-14 px-2 py-2 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none"
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Rate (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="hidden sm:block">
                <label className={labelCls}>HSN / SAC</label>
                <input
                  value={item.hsn}
                  onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                  placeholder="HSN"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Row 3: GST% + Discount */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>GST %</label>
                <select
                  value={item.gstPercent}
                  onChange={(e) => updateItem(item.id, "gstPercent", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none"
                >
                  {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Discount</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={item.discountValue}
                    onChange={(e) => updateItem(item.id, "discountValue", Number(e.target.value))}
                    className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => updateItem(item.id, "discountType", item.discountType === "percent" ? "amount" : "percent")}
                    className="px-2 py-2 rounded-lg border border-border bg-secondary text-xs font-semibold hover:bg-primary/10 transition-colors min-w-[32px]"
                  >
                    {item.discountType === "percent" ? "%" : "₹"}
                  </button>
                </div>
              </div>
            </div>

            {/* HSN on mobile */}
            <div className="sm:hidden mb-3">
              <label className={labelCls}>HSN / SAC</label>
              <input
                value={item.hsn}
                onChange={(e) => updateItem(item.id, "hsn", e.target.value)}
                placeholder="HSN"
                className={inputCls}
              />
            </div>

            {/* Tax + Total summary */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Tax: {formatCurrency(calcItemTax(item))}</p>
                <p className="text-base font-bold text-foreground">{formatCurrency(calcItemTotal(item))}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item card */}
      <button
        onClick={addItem}
        className="mt-3 w-full border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={16} />
        <span className="text-sm font-medium">Add Item</span>
      </button>
    </CollapsibleSection>
  );
};

export default ItemsSection;
