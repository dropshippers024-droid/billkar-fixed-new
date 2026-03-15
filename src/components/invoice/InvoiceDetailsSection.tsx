import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { INVOICE_TYPES } from "./types";
import CollapsibleSection from "./CollapsibleSection";

interface Props {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  type: string;
  onChange: (field: string, value: string | Date) => void;
}

const InvoiceDetailsSection = ({ invoiceNumber, date, dueDate, type, onChange }: Props) => (
  <CollapsibleSection title="Invoice Details">
    <div className="grid grid-cols-2 gap-4">
      {/* Invoice Number */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invoice #</label>
        <input
          value={invoiceNumber}
          onChange={(e) => onChange("invoiceNumber", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Type */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
        <select
          value={type}
          onChange={(e) => onChange("type", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {INVOICE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invoice Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm h-9", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {date ? format(date, "dd MMM yyyy") : "Pick date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && onChange("date", d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {/* Due Date */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm h-9", !dueDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dueDate ? format(dueDate, "dd MMM yyyy") : "Pick date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dueDate} onSelect={(d) => d && onChange("dueDate", d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  </CollapsibleSection>
);

export default InvoiceDetailsSection;
