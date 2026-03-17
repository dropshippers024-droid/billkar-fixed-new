import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Palette, FileSpreadsheet, Crown, Check, Users, RefreshCw, Bell } from "lucide-react";
import { isTrialActive, getTrialDaysLeft, isPro } from "@/lib/planStore";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: "invoice_limit" | "template" | "gstr_export" | "export" | string;
}

const triggerConfig: Record<string, { icon: React.ReactNode; headline: string; subtext: string }> = {
  invoice_limit: {
    icon: <Zap size={28} className="text-amber-500" />,
    headline: "Unlock more power with Pro",
    subtext: "You're on free plan. Upgrade for advanced features.",
  },
  template: {
    icon: <Palette size={28} className="text-indigo-500" />,
    headline: "Unlock all 8 premium templates",
    subtext: "Stand out with beautiful professional invoice designs.",
  },
  gstr_export: {
    icon: <FileSpreadsheet size={28} className="text-indigo-500" />,
    headline: "GSTR-1 export needs Pro",
    subtext: "Export GST data in portal-ready format. Save hours every month.",
  },
  export: {
    icon: <FileSpreadsheet size={28} className="text-indigo-500" />,
    headline: "Export reports with Pro",
    subtext: "Download detailed reports in Excel and PDF formats.",
  },
  team: {
    icon: <Users size={28} className="text-indigo-500" />,
    headline: "Invite team members with Pro",
    subtext: "Add staff, accountants and partners to your account.",
  },
  recurring: {
    icon: <RefreshCw size={28} className="text-indigo-500" />,
    headline: "Auto-generate recurring invoices",
    subtext: "Set it once and BillKar creates invoices automatically.",
  },
  reminder: {
    icon: <Bell size={28} className="text-amber-500" />,
    headline: "Send payment reminders",
    subtext: "Auto-remind customers before and after due dates via WhatsApp.",
  },
};

const proFeatures = [
  "8 premium invoice templates",
  "Payment reminders via WhatsApp",
  "Recurring auto-invoices",
  "GSTR-1 export (portal-ready)",
  "3 team members",
  "Sales report Excel export",
  "Priority email support",
];

const businessFeatures = [
  "Everything in Pro, plus:",
  "10 team members",
  "Multi-business (up to 5)",
  "Excel + PDF bulk exports",
  "Priority WhatsApp support",
  "Advanced analytics",
];

const UpgradeModal = ({ open, onClose, trigger = "" }: UpgradeModalProps) => {
  const config = triggerConfig[trigger] || {
    icon: <Crown size={28} className="text-indigo-500" />,
    headline: "Upgrade your plan",
    subtext: "Unlock powerful features to grow your business.",
  };
  const trial = isTrialActive();
  const trialDaysLeft = getTrialDaysLeft();
  const [tab, setTab] = useState<"pro" | "business">("pro");

  if (isPro()) return null;

  const features = tab === "pro" ? proFeatures : businessFeatures;
  const price = tab === "pro" ? 299 : 599;
  const originalPrice = tab === "pro" ? 399 : 799;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Gradient top bar */}
            <div className="h-1.5 w-full" style={{
              background: tab === "pro"
                ? "linear-gradient(90deg, #10b981, #059669)"
                : "linear-gradient(90deg, #6366f1, #4f46e5)"
            }} />

            <div className="p-6">
              <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                  tab === "pro" ? "bg-emerald-50" : "bg-indigo-50")}>
                  {config.icon}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 leading-tight">{config.headline}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{config.subtext}</p>
                </div>
              </div>

              {/* Plan toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
                <button
                  onClick={() => setTab("pro")}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    tab === "pro"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Pro · ₹299/mo
                </button>
                <button
                  onClick={() => setTab("business")}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    tab === "business"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Business · ₹599/mo
                </button>
              </div>

              {/* Price */}
              <div className={cn("rounded-2xl p-4 mb-5 text-center", tab === "pro" ? "bg-emerald-50" : "bg-indigo-50")}>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={cn("text-3xl font-extrabold", tab === "pro" ? "text-emerald-700" : "text-indigo-700")}>
                    ₹{price}
                  </span>
                  <span className="text-sm text-gray-400 line-through">₹{originalPrice}</span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">billed annually · save 25%</p>
                <div className={cn("inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full mt-2",
                  tab === "pro" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700")}>
                  🎉 7-day free trial · No card needed
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      tab === "pro" ? "bg-emerald-100" : "bg-indigo-100")}>
                      <Check size={11} className={tab === "pro" ? "text-emerald-600" : "text-indigo-600"} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Trial notice */}
              {trial && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-center">
                  <p className="text-xs font-semibold text-amber-700">
                    ⚠️ Your trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}. Upgrade to keep your features!
                  </p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => { onClose(); window.location.href = "/#pricing"; }}
                className={cn("w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all mb-2",
                  tab === "pro"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                )}
                style={{ boxShadow: tab === "pro" ? "0 4px 14px rgba(16,185,129,0.3)" : "0 4px 14px rgba(99,102,241,0.3)" }}
              >
                Start 7-Day Free Trial →
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;