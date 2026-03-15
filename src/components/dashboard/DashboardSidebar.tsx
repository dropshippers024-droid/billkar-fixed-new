import { getCurrentPlan, isTrialActive, isPro } from "@/lib/planStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Package,
  Users,
  BarChart3,
  Receipt,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { signOut } from "@/lib/authStore";
import { getCurrentPlan, getInvoiceCount, isTrialActive, getTrialDaysLeft, isPro, syncPlanFromUser, getTeamRole } from "@/lib/planStore";
import { api, getActiveBusiness, setActiveBusiness } from "@/lib/api";

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Invoices",  icon: FileText,         href: "/dashboard/invoices" },
  { label: "Reminders", icon: Bell,             href: "/dashboard/reminders", pro: true },
  { label: "Estimates", icon: FileCheck,         href: "/dashboard/estimates" },
  { label: "Products",  icon: Package,           href: "/dashboard/products" },
  { label: "Customers", icon: Users,             href: "/dashboard/customers" },
];

const reportsNav = [
  { label: "Sales",    icon: BarChart3, href: "/dashboard/reports/sales" },
  { label: "GST",      icon: Receipt,   href: "/dashboard/reports/gst" },
  { label: "Expenses", icon: Wallet,    href: "/dashboard/expenses" },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

type TeamMembership = {
  business_id: string;
  business_name: string;
  role: string;
};

type SidebarInvoice = {
  due_date?: string;
  status?: string;
};

// Read user from localStorage ONCE at module level — never flickers
function readCachedUser() {
  try {
    const raw = localStorage.getItem("billkar_user");
    if (!raw) return { name: "", avatar: "" };
    const u = JSON.parse(raw);
    return {
      name: u.full_name || u.name || u.email?.split("@")[0] || "",
      avatar: u.avatar_url || "",
    };
  } catch {
    return { name: "", avatar: "" };
  }
}

const DashboardSidebar = memo(({ collapsed, onToggle }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Cached user — read from localStorage synchronously, no flash
  const cached = useRef(readCachedUser());
  const [authName, setAuthName] = useState(cached.current.name);
  const [authAvatar, setAuthAvatar] = useState(cached.current.avatar);
  const [overdueCount, setOverdueCount] = useState(0);
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>(() => {
    try { return JSON.parse(localStorage.getItem("billkar_team_memberships") || "[]"); } catch { return []; }
  });
  const [activeBiz, setActiveBiz] = useState(getActiveBusiness());
  const hasFetched = useRef(false);

  // Plan state — read once, update only via plan-updated event
  const [planState, setPlanState] = useState(() => ({
    plan: getCurrentPlan(),
    isFree: getCurrentPlan() === "free",
    trial: isTrialActive(),
    trialLeft: getTrialDaysLeft(),
    invCount: getInvoiceCount(),
  }));

  useEffect(() => {
    // Fetch from API ONCE on mount
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Fetch fresh user data but DON'T update state if name already matches
    // This prevents the flash from email->name
    // Note: api.getMe() already syncs plan to localStorage internally
    api.getMe().then(({ user: u, teamMemberships: tm }) => {
      if (!u) return;
      const freshName = u.full_name || u.email?.split("@")[0] || "";
      const freshAvatar = u.avatar_url || "";
      setAuthName((prev: string) => prev || freshName);
      setAuthAvatar((prev: string) => prev || freshAvatar);
      syncPlanFromUser(u);
      if (tm?.length) setTeamMemberships(tm);
    }).catch(() => {});

    api.getInvoices().then(({ invoices }) => {
      const today = new Date().toISOString().split("T")[0];
      const overdue = (invoices as SidebarInvoice[] || []).filter((i) =>
        i.status === "overdue" || (i.due_date < today && i.status !== "paid" && i.status !== "draft")
      );
      setOverdueCount(overdue.length);
    }).catch(() => {});

    return () => {};
  }, []);

  // Listen for profile updates (from Settings save)
  useEffect(() => {
    const handleProfileUpdate = () => {
      const fresh = readCachedUser();
      setAuthName(fresh.name);
      setAuthAvatar(fresh.avatar);
    };
    const handlePlanUpdate = () => {
      setPlanState({
        plan: getCurrentPlan(),
        isFree: getCurrentPlan() === "free",
        trial: isTrialActive(),
        trialLeft: getTrialDaysLeft(),
        invCount: getInvoiceCount(),
      });
    };
    const handleBizSwitch = () => setActiveBiz(getActiveBusiness());
    window.addEventListener("billkar:profile-updated", handleProfileUpdate);
    window.addEventListener("billkar:plan-updated", handlePlanUpdate);
    window.addEventListener("billkar:business-switched", handleBizSwitch);
    return () => {
      window.removeEventListener("billkar:profile-updated", handleProfileUpdate);
      window.removeEventListener("billkar:plan-updated", handlePlanUpdate);
      window.removeEventListener("billkar:business-switched", handleBizSwitch);
    };
  }, []);

  const { plan, isFree, trial, trialLeft, invCount } = planState;
  const teamRole = getTeamRole();
  const isViewerRole = teamRole === "viewer";
  const displayName = authName || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSwitchBusiness = useCallback((biz: { business_id: string; business_name: string; role: string } | null) => {
    if (biz) {
      setActiveBusiness({ id: biz.business_id, name: biz.business_name, role: biz.role });
    } else {
      setActiveBusiness(null);
    }
    window.location.reload();
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [navigate]);

  const pathname = location.pathname;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2 }}
      className="hidden md:flex flex-col h-screen bg-white border-r border-gray-200 fixed left-0 top-0 z-40 overflow-hidden"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
        <Link to="/" className="text-xl font-extrabold tracking-tight">
          {collapsed ? "B" : <>Bill<span className="text-gradient-primary">Kar</span></>}
        </Link>
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Business switcher — only show if user has team memberships */}
      {teamMemberships.length > 0 && !collapsed && (
        <div className="px-3 pt-3 pb-1">
          <select
            value={activeBiz?.id || "own"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "own") {
                handleSwitchBusiness(null);
              } else {
                const m = teamMemberships.find((t) => t.business_id === val);
                if (m) handleSwitchBusiness(m);
              }
            }}
            className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="own">My Business</option>
            {teamMemberships.map((m) => (
              <option key={m.business_id} value={m.business_id}>
                {m.business_name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      )}
      {activeBiz && !collapsed && (
        <div className="mx-3 mt-1 mb-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-[10px] font-semibold text-indigo-700 truncate">
            Viewing: {activeBiz.name}
          </p>
          <p className="text-[10px] text-indigo-500 capitalize">Role: {activeBiz.role}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto min-h-0">
        {mainNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium border-l-[3px] border-transparent"
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon size={18} className={active ? "text-indigo-600" : "text-gray-400"} />
                {item.label === "Invoices" && overdueCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.pro && !isPro() && (
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">PRO</span>
              )}
            </Link>
          );
        })}

        <div className="pt-5 pb-1">
          {!collapsed && (
            <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Reports</span>
          )}
        </div>
        {reportsNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium border-l-[3px] border-transparent"
              )}
            >
              <item.icon size={18} className={active ? "text-indigo-600" : "text-gray-400"} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </Link>
          );
        })}

        <div className="pt-5 pb-1">
          {!collapsed && (
            <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Settings</span>
          )}
        </div>
        {(() => {
          const active = pathname === "/dashboard/settings";
          return (
            <Link
              to={isViewerRole ? "/dashboard/settings?tab=profile" : "/dashboard/settings"}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700 font-semibold border-l-[3px] border-indigo-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium border-l-[3px] border-transparent"
              )}
            >
              <Settings size={18} className={active ? "text-indigo-600" : "text-gray-400"} />
              {!collapsed && <span className="flex-1">Settings</span>}
            </Link>
          );
        })()}
      </nav>

      {/* User — fixed bottom */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0">
        {isFree && !trial && !collapsed && (
          <div className="px-2 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">{invCount}/50 invoices</span>
              <a href="/#pricing" className="text-[10px] font-semibold text-primary hover:underline">Upgrade →</a>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", invCount > 45 ? "bg-destructive" : invCount >= 35 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${Math.min((invCount / 50) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        {trial && !collapsed && (
          <div className="px-2 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-amber-600">Trial: {trialLeft}d left</span>
              <a href="/#pricing" className="text-[10px] font-semibold text-primary hover:underline">Upgrade →</a>
            </div>
            <div className="h-1.5 w-full rounded-full bg-amber-200 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${((7 - trialLeft) / 7) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 overflow-hidden h-[60px]">
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0 overflow-hidden">
            {authAvatar ? <img src={authAvatar} alt="" className="w-full h-full object-cover" /> : initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 inline-block",
                trial ? "bg-amber-100 text-amber-700" :
                plan === "business" ? "bg-indigo-100 text-indigo-700" :
                plan === "pro" ? "bg-emerald-100 text-emerald-700" :
                "bg-gray-100 text-gray-600")}>
                {trial ? `Trial: ${trialLeft}d left` : isFree ? "Free Plan" : plan === "pro" ? "Pro Plan" : "Business Plan"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full mt-1"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </motion.aside>
  );
});

DashboardSidebar.displayName = "DashboardSidebar";

export default DashboardSidebar;
