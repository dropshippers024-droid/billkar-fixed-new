import { LayoutDashboard, FileText, Plus, Wallet, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  onMenuToggle: () => void;
}

const MobileBottomBar = ({ onMenuToggle }: Props) => {
  const location = useLocation();

  const leftTabs = [
    { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
    { icon: FileText, label: "Invoices", href: "/dashboard/invoices" },
  ];

  const rightTabs = [
    { icon: Wallet, label: "Expenses", href: "/dashboard/expenses" },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ height: "calc(64px + var(--safe-area-bottom))", paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div className="flex items-center h-16 px-4">
        {/* Left tabs */}
        {leftTabs.map((t, i) => (
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
        ))}

        {/* Center + button */}
        <div className="flex-1 flex justify-center">
          <Link
            to="/dashboard/invoices/new"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-xl -mt-6 border-4 border-background"
          >
            <Plus size={24} />
          </Link>
        </div>

        {/* Right tabs */}
        {rightTabs.map((t, i) => (
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
        ))}

        {/* More button */}
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