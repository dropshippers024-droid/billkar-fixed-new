import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Package, BarChart3, Receipt, Wallet, Settings, Plus,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

const commands = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Invoices", icon: FileText, href: "/dashboard/invoices" },
  { label: "New Invoice", icon: Plus, href: "/dashboard/invoices/new" },
  { label: "Customers", icon: Users, href: "/dashboard/customers" },
  { label: "Products", icon: Package, href: "/dashboard/products" },
  { label: "Sales Report", icon: BarChart3, href: "/dashboard/reports/sales" },
  { label: "GST Report", icon: Receipt, href: "/dashboard/reports/gst" },
  { label: "Expenses", icon: Wallet, href: "/dashboard/expenses" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {commands.map((c) => (
            <CommandItem key={c.href} onSelect={() => { navigate(c.href); setOpen(false); }}>
              <c.icon className="mr-2 h-4 w-4" />
              <span>{c.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
