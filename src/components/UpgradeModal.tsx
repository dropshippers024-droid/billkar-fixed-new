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

const triggerConfig: Record<string, { icon: React.ReactNode; headline: string }> = {
  invoice_limit: { icon: <Zap size={28} className="text-amber-500" />, headline: "You've hit 50 invoices this month!" },
  template: { icon: <Palette size={28} className="text-primary" />, headline: "Unlock all 8 premium templates" },
  gstr_export: { icon: <FileSpreadsheet size={28} className="text-primary" />, headline: "GSTR-1 export needs Pro" },
  export: { icon: <FileSpreadsheet size={28} className="text-primary" />, headline: "Export reports with Pro" },
  team: { icon: <Users size={28} className="text-primary" />, headline: "Team invites need a paid plan" },
  recurring: { icon: <RefreshCw size={28} className="text-primary" />, headline: "Recurring invoices need Pro" },
  reminder:  { icon: <Bell size={28} className="text-amber-500" />,   headline: "Payment reminders need Pro" },
};

const proFeatures = [
  "Unlimited invoices",
  "All 8 premium templates",
  "UPI QR code on invoices",
  "Payment reminders",
  "Recurring invoices",
  "GSTR-1 export",
  "3 team members",
  "Priority support",
];

const businessFeatures = [
  "Everything in Pro, plus:",
  "10 team members",
  "Excel + PDF report exports",
  "Multi-business (up to 5)",
  "Priority WhatsApp support",
];

const UpgradeModal = ({ open, onClose, trigger = "" }: UpgradeModalProps) => {
  const config = triggerConfig[trigger] || { icon: <Crown size={28} className="text-primary" />, headline: "Upgrade your plan" };
  const trial = isTrialActive();
  const trialDaysLeft = getTrialDaysLeft();
  const [tab, setTab] = useState<"pro" | "business">("pro");

  // Pro/Business users never see this modal
  if (isPro()) return null;

  const features = tab === "pro" ? proFeatures : businessFeatures;
  const price = tab === "pro" ? 399 : 799;
  const perDay = tab === "pro" ? 13 : 27;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Top accent bar */}
            <div className={cn("h-1 w-full", tab === "pro" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-indigo-500 to-indigo-600")} />

            <div className="p-7">
              <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {config.icon}
                </div>
                <div>
                  <h2 className="text-base font-extrabold leading-tight">{config.headline}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose the plan that fits your needs</p>
                </div>
              </div>

              {/* Pro / Business toggle */}
              <div className="flex bg-secondary rounded-lg p-1 mb-5">
                <button
                  onClick={() => setTab("pro")}
                  className={cn("flex-1 py-1.5 rounded-md text-xs font-semibold transition-all",
                    tab === "pro" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Pro · ₹399/mo
                </button>
                <button
                  onClick={() => setTab("business")}
                  className={cn("flex-1 py-1.5 rounded-md text-xs font-semibold transition-all",
                    tab === "business" ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Business · ₹799/mo
                </button>
              </div>

              {/* Features checklist */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {tab === "pro" ? "Pro Plan Includes" : "Business Plan Includes"}
                </p>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <span className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                        tab === "pro" ? "bg-emerald-100" : "bg-indigo-100")}>
                        <Check size={10} className={tab === "pro" ? "text-emerald-600" : "text-indigo-600"} strokeWidth={3} />
                      </span>
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price hint / trial notice */}
              <p className="text-xs text-muted-foreground text-center mb-4">
                {trial
                  ? <span className="font-semibold text-amber-600">Your trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}. Upgrade to keep features.</span>
                  : <>All this for just <span className="font-semibold text-foreground">₹{perDay}/day</span> · ₹{price}/mo</>
                }
              </p>

              {/* CTAs */}
              <div className="space-y-2">
                <button
                  onClick={() => { onClose(); window.location.href = "/#pricing"; }}
                  className={cn("block w-full py-2.5 rounded-xl text-sm font-semibold text-center text-white hover:opacity-90 transition-opacity",
                    tab === "pro" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700")}
                >
                  Upgrade to {tab === "pro" ? "Pro" : "Business"} →
                </button>
                <button
                  onClick={onClose}
                  className="block w-full py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
