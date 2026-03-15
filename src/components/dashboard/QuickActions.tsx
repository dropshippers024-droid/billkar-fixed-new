import { motion } from "framer-motion";
import { FileText, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { icon: FileText, title: "Create Invoice", desc: "Generate a new GST invoice", href: "/dashboard/invoices/new", color: "text-primary", bg: "bg-primary/10" },
  { icon: Users, title: "Add Customer", desc: "Add a new customer record", href: "/dashboard/customers", color: "text-accent", bg: "bg-accent/10" },
  { icon: BarChart3, title: "View Reports", desc: "Check your sales & GST reports", href: "/dashboard/reports/sales", color: "text-primary", bg: "bg-primary/10" },
];

const QuickActions = () => (
  <div className="grid sm:grid-cols-3 gap-4">
    {actions.map((a, i) => (
      <motion.div
        key={a.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + i * 0.1 }}
      >
        <Link
          to={a.href}
          className="flex items-center gap-4 bg-background rounded-2xl border border-border shadow-sm p-5 hover:-translate-y-1 hover:shadow-md transition-all"
        >
          <div className={`w-11 h-11 rounded-xl ${a.bg} flex items-center justify-center flex-shrink-0`}>
            <a.icon size={20} className={a.color} />
          </div>
          <div>
            <p className="font-semibold text-sm">{a.title}</p>
            <p className="text-xs text-muted-foreground">{a.desc}</p>
          </div>
        </Link>
      </motion.div>
    ))}
  </div>
);

export default QuickActions;
