import { motion } from "framer-motion";
import { FileText, Users, BarChart3, Package, Wallet, Receipt } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    icon: FileText,
    title: "Create Invoice",
    desc: "Generate a new GST invoice",
    href: "/dashboard/invoices/new",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    hoverBorder: "hover:border-indigo-200",
  },
  {
    icon: Users,
    title: "Add Customer",
    desc: "Add a new customer record",
    href: "/dashboard/customers",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    hoverBorder: "hover:border-emerald-200",
  },
  {
    icon: BarChart3,
    title: "Sales Report",
    desc: "Check your sales & GST reports",
    href: "/dashboard/reports/sales",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    hoverBorder: "hover:border-violet-200",
  },
  {
    icon: Package,
    title: "Add Product",
    desc: "Add items to your catalogue",
    href: "/dashboard/products",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    hoverBorder: "hover:border-amber-200",
  },
  {
    icon: Wallet,
    title: "Add Expense",
    desc: "Track your business expenses",
    href: "/dashboard/expenses",
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    hoverBorder: "hover:border-rose-200",
  },
  {
    icon: Receipt,
    title: "GST Report",
    desc: "View & export GSTR-1 data",
    href: "/dashboard/reports/gst",
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
    hoverBorder: "hover:border-cyan-200",
  },
];

const QuickActions = () => (
  <div>
    <h3 className="font-bold text-base mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {actions.map((a, i) => (
        <motion.div
          key={a.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.05 }}
          whileHover={{ y: -3 }}
        >
          <Link
            to={a.href}
            className={`flex items-center gap-3 bg-white rounded-2xl border border-border p-4 transition-all duration-200 ${a.hoverBorder} hover:shadow-md`}
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
          >
            <div className={`w-10 h-10 rounded-xl ${a.iconBg} flex items-center justify-center flex-shrink-0`}>
              <a.icon size={18} className={a.iconColor} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default QuickActions;