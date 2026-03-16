import { LayoutDashboard, FileText, Plus, Users, Wallet, Menu } from "lucide-react";
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
  { icon: Wallet, label: "Expenses", href: "/dashboard/expenses" },
];

const MobileBottomBar = ({ onMenuToggle }: Props) => {
  const location = useLocation();

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ height: "calc(64px + var(--safe-area-bottom))", paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 px-2 relative">
        {tabs.map((t, i) =>
          t.center ? (
            <Link
              key={i}
              to={t.href}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-xl absolute left-1/2 -translate-x-1/2 -top-5 border-4 border-background"
            >
              <t.icon size={24} />
            </Link>
          ) : (
            <Link
              key={i}
              to={t.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1",
                location.pathname === t.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <t.icon size={20} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          )
        )}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 text-muted-foreground"
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </div>
  );
};

export default MobileBottomBar;