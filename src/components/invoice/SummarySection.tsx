import { type InvoiceItem } from "./types";
import { calcItemTaxable, calcItemTax, isIntraState, formatCurrency, numberToWords } from "./utils";

interface Props {
  items: InvoiceItem[];
  businessState: string;
  customerState: string;
}

const SummarySection = ({ items, businessState, customerState }: Props) => {
  const subtotal = items.reduce((s, i) => s + calcItemTaxable(i), 0);
  const totalTax = items.reduce((s, i) => s + calcItemTax(i), 0);
  const grandTotal = subtotal + totalTax;
  const intra = isIntraState(businessState, customerState);

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {intra ? "Intra-State" : "Inter-State"} Supply
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${intra ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
          {intra ? "CGST + SGST" : "IGST"}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        {intra ? (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CGST</span>
              <span className="font-medium">{formatCurrency(totalTax / 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGST</span>
              <span className="font-medium">{formatCurrency(totalTax / 2)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="text-muted-foreground">IGST</span>
            <span className="font-medium">{formatCurrency(totalTax)}</span>
          </div>
        )}

        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-bold text-base">Grand Total</span>
          <span className="font-extrabold text-lg text-primary">{formatCurrency(grandTotal)}</span>
        </div>
        <p className="text-xs text-muted-foreground italic">{numberToWords(grandTotal)}</p>
      </div>
    </div>
  );
};

export default SummarySection;
