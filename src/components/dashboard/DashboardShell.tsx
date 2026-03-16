import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import MobileBottomBar from "@/components/dashboard/MobileBottomBar";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import SupportButton from "@/components/SupportButton";

const mobileNavItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Invoices", href: "/dashboard/invoices" },
  { label: "Estimates", href: "/dashboard/estimates" },
  { label: "Products", href: "/dashboard/products" },
  { label: "Customers", href: "/dashboard/customers" },
  { label: "Expenses", href: "/dashboard/expenses" },
  { label: "Sales Report", href: "/dashboard/reports/sales" },
  { label: "GST Report", href: "/dashboard/reports/gst" },
  { label: "Reminders", href: "/dashboard/reminders" },
  { label: "Settings", href: "/dashboard/settings" },
];

interface Props {
  children: React.ReactNode;
}

const DashboardShell = ({ children }: Props) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <AnimatePresence>
        {mobileDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setMobileDrawer(false)} className="md:hidden fixed inset-0 bg-foreground z-50" />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-background border-r border-border z-50 overflow-y-auto">
              <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <span className="text-xl font-extrabold">Bill<span className="text-gradient-primary">Kar</span></span>
                <button onClick={() => setMobileDrawer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
              </div>
              <nav className="py-4 px-3 space-y-1 overflow-y-auto">
                {mobileNavItems.map((item) => (
                  <Link key={item.label} to={item.href} onClick={() => setMobileDrawer(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`transition-all duration-200 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"}`}>
        <DashboardTopbar onMobileMenuToggle={() => setMobileDrawer(true)} />
        <main className="p-4 md:p-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <div className="md:hidden">
        <MobileBottomBar onMenuToggle={() => setMobileDrawer(true)} />
      </div>

      <SupportButton />
    </div>
  );
};

export default DashboardShell;