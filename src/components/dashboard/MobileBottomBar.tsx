import { LayoutDashboard, FileText, Plus, Users, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  onMenuToggle: () => void;
}

const tabs = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: FileText, label: "Invoices", href: "/dashboard/invoices" },
  { icon: Plus, label: "", href: "/dashboard/invoices/new", center: true },
  { icon: Users, label: "Customers", href: "/dashboard/customers" },
];

const MobileBottomBar = ({ onMenuToggle }: Props) => {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-center justify-around px-2" style={{ height: "calc(64px + var(--safe-area-bottom))", paddingBottom: "var(--safe-area-bottom)" }}>
      {tabs.map((t, i) => (
        <Link
          key={i}
          to={t.href}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5",
            t.center
              ? "w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg -mt-5"
              : location.pathname === t.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <t.icon size={t.center ? 22 : 20} />
          {!t.center && <span className="text-[10px] font-medium">{t.label}</span>}
        </Link>
      ))}
      <button
        onClick={onMenuToggle}
        className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
      >
        <Menu size={20} />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </div>
  );
};

export default MobileBottomBar;
