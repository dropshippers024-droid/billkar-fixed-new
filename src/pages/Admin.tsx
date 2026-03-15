import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Crown, Building2, FileText, UserPlus, Shield, Search, MoreVertical, Trash2, ArrowLeft, TrendingUp, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  businessUsers: number;
  totalInvoices: number;
  todaySignups: number;
  thisWeekSignups: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  plan: string | null;
  plan_expires_at: string | null;
  created_at: string;
  business_name: string | null;
  gstin: string | null;
  invoice_count: number;
}

type FilterTab = "all" | "free" | "pro" | "business" | "expired";

const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const planBadge = (plan: string | null, expiresAt: string | null) => {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  if (isExpired) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>;
  if (plan === "business") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Business</span>;
  if (plan === "pro") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Pro</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Free</span>;
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
};

const avatarColor = (name: string | null) => {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-teal-500", "bg-pink-500"];
  const hash = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const Admin = () => {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAdmin = useCallback(async () => {
    try {
      await api.getAdminStats();
      setAuthorized(true);
      fetchData();
    } catch {
      setAuthorized(false);
    }
  }, [fetchData]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const handleUpdatePlan = async (userId: string, plan: string, days?: number) => {
    try {
      await api.updateUserPlan({ user_id: userId, plan, days });
      toast.success(`Plan updated to ${plan}${days ? ` (${days} days)` : ""}`);
      setOpenMenu(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update plan"));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      toast.success("User deleted");
      setDeleteConfirm(null);
      setOpenMenu(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete user"));
    }
  };

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.business_name || "").toLowerCase().includes(q)
      );
    }
    if (filter === "free") list = list.filter(u => !u.plan || u.plan === "free");
    else if (filter === "pro") list = list.filter(u => u.plan === "pro" && !(u.plan_expires_at && new Date(u.plan_expires_at) < new Date()));
    else if (filter === "business") list = list.filter(u => u.plan === "business" && !(u.plan_expires_at && new Date(u.plan_expires_at) < new Date()));
    else if (filter === "expired") list = list.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) < new Date());
    return list;
  }, [users, search, filter]);

  const recentSignups = useMemo(() => {
    return [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  }, [users]);

  const mrr = stats ? (stats.proUsers * 399) + (stats.businessUsers * 799) : 0;
  const arr = mrr * 12;

  // Access denied
  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield size={26} className="text-red-500" />
          </div>
          <h1 className="text-xl font-extrabold mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-6">You don't have admin privileges.</p>
          <Link to="/dashboard" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Loading auth check
  if (authorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Free Users", value: stats.freeUsers, icon: Users, color: "bg-gray-100 text-gray-600" },
    { label: "Pro Users", value: stats.proUsers, icon: Crown, color: "bg-emerald-100 text-emerald-600", sub: fmtINR(stats.proUsers * 399) + "/mo" },
    { label: "Business Users", value: stats.businessUsers, icon: Building2, color: "bg-indigo-100 text-indigo-600", sub: fmtINR(stats.businessUsers * 799) + "/mo" },
    { label: "Total Invoices", value: stats.totalInvoices, icon: FileText, color: "bg-blue-100 text-blue-600" },
    { label: "Today Signups", value: stats.todaySignups, icon: UserPlus, color: "bg-amber-100 text-amber-600", sub: `${stats.thisWeekSignups} this week` },
  ] : [];

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${users.length})` },
    { key: "free", label: "Free" },
    { key: "pro", label: "Pro" },
    { key: "business", label: "Business" },
    { key: "expired", label: "Expired" },
  ];

  const ActionMenu = ({ user, position = "right" }: { user: AdminUser; position?: "left" | "right" }) => (
    <>
      <div className="fixed inset-0 z-30" onClick={() => { setOpenMenu(null); setDeleteConfirm(null); }} />
      <div className={`absolute ${position === "right" ? "right-0" : "left-0"} top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-40 py-1 w-56`}>
        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Plan</div>
        <button onClick={() => handleUpdatePlan(user.id, "pro", 30)} className="w-full text-left px-4 py-2 text-xs hover:bg-emerald-50 transition-colors text-emerald-700 font-medium flex items-center gap-2">
          <Crown size={12} /> Activate Pro (30 days)
        </button>
        <button onClick={() => handleUpdatePlan(user.id, "pro", 365)} className="w-full text-left px-4 py-2 text-xs hover:bg-emerald-50 transition-colors text-emerald-700 font-medium flex items-center gap-2">
          <Crown size={12} /> Activate Pro (365 days)
        </button>
        <button onClick={() => handleUpdatePlan(user.id, "business", 30)} className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 transition-colors text-indigo-700 font-medium flex items-center gap-2">
          <Building2 size={12} /> Activate Business (30 days)
        </button>
        <button onClick={() => handleUpdatePlan(user.id, "business", 365)} className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 transition-colors text-indigo-700 font-medium flex items-center gap-2">
          <Building2 size={12} /> Activate Business (365 days)
        </button>
        <button onClick={() => handleUpdatePlan(user.id, "free")} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors text-gray-500 font-medium flex items-center gap-2">
          <Users size={12} /> Downgrade to Free
        </button>
        <div className="border-t border-gray-100 my-1" />
        {deleteConfirm === user.id ? (
          <div className="px-4 py-2">
            <p className="text-[10px] text-red-600 font-semibold mb-2">Delete this user and ALL their data?</p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700">Yes, Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 rounded-lg border border-gray-200 text-[10px] font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(user.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 transition-colors text-red-600 font-medium flex items-center gap-2">
            <Trash2 size={12} /> Delete User
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ArrowLeft size={16} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">Admin Dashboard</h1>
              <p className="text-[11px] text-gray-400">BillKar Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData()} className="text-[10px] font-semibold text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
              Refresh
            </button>
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* MRR Banner */}
        {stats && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-indigo-200" />
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Monthly Recurring Revenue</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-8">
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold">{fmtINR(mrr)}<span className="text-base font-semibold text-indigo-200">/mo</span></p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-indigo-200 text-[11px]">ARR</p>
                  <p className="font-bold">{fmtINR(arr)}</p>
                </div>
                <div>
                  <p className="text-indigo-200 text-[11px]">Paid Users</p>
                  <p className="font-bold">{(stats.proUsers + stats.businessUsers)}</p>
                </div>
                <div>
                  <p className="text-indigo-200 text-[11px]">ARPU</p>
                  <p className="font-bold">{(stats.proUsers + stats.businessUsers) > 0 ? fmtINR(Math.round(mrr / (stats.proUsers + stats.businessUsers))) : "₹0"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                  <s.icon size={18} />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
                {s.sub && <p className="text-[10px] font-semibold text-emerald-600 mt-1">{s.sub}</p>}
              </div>
            ))}
          </motion.div>
        )}

        {/* Users Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              <h2 className="font-bold text-sm">All Users</h2>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{filtered.length}</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, business..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="px-5 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
            {filterTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === t.key ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No users found</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                      <th className="text-left px-4 py-3 font-semibold">Name</th>
                      <th className="text-left px-4 py-3 font-semibold">Email</th>
                      <th className="text-left px-4 py-3 font-semibold">Business</th>
                      <th className="text-left px-4 py-3 font-semibold">Plan</th>
                      <th className="text-right px-4 py-3 font-semibold">Invoices</th>
                      <th className="text-left px-4 py-3 font-semibold">Signed Up</th>
                      <th className="text-left px-4 py-3 font-semibold">Expires</th>
                      <th className="px-4 py-3 font-semibold w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, idx) => (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3 text-xs text-gray-300 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full ${avatarColor(u.full_name)} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-[10px] font-bold text-white">{getInitials(u.full_name)}</span>
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[140px]">{u.full_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[120px]">{u.business_name || "—"}</td>
                        <td className="px-4 py-3">{planBadge(u.plan, u.plan_expires_at)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{u.invoice_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-400" title={u.created_at ? format(new Date(u.created_at), "dd MMM yyyy, hh:mm a") : ""}>
                          {u.created_at ? timeAgo(u.created_at) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {u.plan_expires_at ? format(new Date(u.plan_expires_at), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenu === u.id && <ActionMenu user={u} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((u, idx) => (
                  <div key={u.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${avatarColor(u.full_name)} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-[10px] font-bold text-white">{getInitials(u.full_name)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{u.full_name || "No Name"}</p>
                          <p className="text-[11px] text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {planBadge(u.plan, u.plan_expires_at)}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenu === u.id && <ActionMenu user={u} position="right" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 ml-[42px]">
                      <span>{u.business_name || "No business"}</span>
                      <span className="text-gray-300">·</span>
                      <span>{u.invoice_count} invoices</span>
                      <span className="text-gray-300">·</span>
                      <span>{u.created_at ? timeAgo(u.created_at) : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Recent Signups Timeline */}
        {!loading && recentSignups.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              <h2 className="font-bold text-sm">Recent Signups</h2>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Last 10</span>
            </div>
            <div className="divide-y divide-gray-50">
              {recentSignups.map(u => (
                <div key={u.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full ${avatarColor(u.full_name)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-[10px] font-bold text-white">{getInitials(u.full_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || "No Name"}</p>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{u.created_at ? timeAgo(u.created_at) : "—"}</p>
                    {planBadge(u.plan, u.plan_expires_at)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
