import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Bell, Menu, LogOut, Settings, CreditCard, FileText, Users, Package, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "@/lib/authStore";
import { isPro, getCurrentPlan } from "@/lib/planStore";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onMobileMenuToggle: () => void;
}

interface SearchResult {
  type: "invoice" | "customer" | "product";
  id: string;
  label: string;
  sub: string;
  href: string;
}

type SearchInvoice = {
  id: string;
  invoice_number?: string;
  customer_name?: string;
  total_amount?: number | string;
  status?: string;
};

type SearchCustomer = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
};

type SearchProduct = {
  id: string;
  name?: string;
  hsn_sac_code?: string;
  selling_price?: number | string;
};

const DashboardTopbar = ({ onMobileMenuToggle }: Props) => {
  const navigate = useNavigate();

  const [authName, setAuthName]     = useState("");
  const [authEmail, setAuthEmail]   = useState("");
  const [authAvatar, setAuthAvatar] = useState("");
  const [menuOpen, setMenuOpen]     = useState(false);
  const [bellOpen, setBellOpen]     = useState(false);

  // Global search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = () => {
      const cached = api.getUser();
      if (cached) {
        setAuthName(cached.full_name || cached.email?.split("@")[0] || "");
        setAuthEmail(cached.email || "");
        setAuthAvatar(cached.avatar_url || "");
      }
      api.getMe().then(({ user }) => {
        if (user) {
          setAuthName(user.full_name || user.email?.split("@")[0] || "");
          setAuthEmail(user.email || "");
          setAuthAvatar(user.avatar_url || "");
        }
      }).catch(() => {});
    };
    fetchUser();
    window.addEventListener("billkar:profile-updated", fetchUser);
    return () => window.removeEventListener("billkar:profile-updated", fetchUser);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);

    try {
      const lq = q.toLowerCase();

      const [invRes, custRes, prodRes] = await Promise.all([
        api.getInvoices().catch(() => ({ invoices: [] })),
        api.getCustomers().catch(() => ({ customers: [] })),
        api.getProducts().catch(() => ({ products: [] })),
      ]);

      const results: SearchResult[] = [];

      ((invRes.invoices || []) as SearchInvoice[])
        .filter((inv) =>
          inv.invoice_number?.toLowerCase().includes(lq) ||
          inv.customer_name?.toLowerCase().includes(lq)
        )
        .slice(0, 5)
        .forEach((inv) => {
          results.push({
            type: "invoice",
            id: inv.id,
            label: inv.invoice_number,
            sub: `${inv.customer_name} · ₹${Number(inv.total_amount).toLocaleString("en-IN")} · ${inv.status}`,
            href: "/dashboard/invoices",
          });
        });

      ((custRes.customers || []) as SearchCustomer[])
        .filter((c) =>
          c.name?.toLowerCase().includes(lq) ||
          c.email?.toLowerCase().includes(lq) ||
          c.phone?.includes(lq)
        )
        .slice(0, 5)
        .forEach((c) => {
          results.push({
            type: "customer",
            id: c.id,
            label: c.name,
            sub: [c.email, c.phone].filter(Boolean).join(" · ") || "Customer",
            href: "/dashboard/customers",
          });
        });

      ((prodRes.products || []) as SearchProduct[])
        .filter((p) =>
          p.name?.toLowerCase().includes(lq) ||
          p.hsn_sac_code?.toLowerCase().includes(lq)
        )
        .slice(0, 5)
        .forEach((p) => {
          results.push({
            type: "product",
            id: p.id,
            label: p.name,
            sub: `₹${Number(p.selling_price || 0).toLocaleString("en-IN")}${p.hsn_sac_code ? ` · HSN ${p.hsn_sac_code}` : ""}`,
            href: "/dashboard/products",
          });
        });

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    searchTimeout.current = setTimeout(() => runSearch(val), 300);
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  const typeIcon = (type: SearchResult["type"]) => {
    if (type === "invoice") return <FileText size={14} className="text-primary" />;
    if (type === "customer") return <Users size={14} className="text-emerald-600" />;
    return <Package size={14} className="text-amber-500" />;
  };

  const typeLabel = (type: SearchResult["type"]) => {
    if (type === "invoice") return "Invoice";
    if (type === "customer") return "Customer";
    return "Product";
  };

  const grouped = ["invoice", "customer", "product"].map((type) => ({
    type: type as SearchResult["type"],
    items: searchResults.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const initial = authName.charAt(0).toUpperCase() || "?";

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <button onClick={onMobileMenuToggle} className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary">
        <Menu size={22} />
      </button>

      {/* Global search */}
      <div className="hidden sm:flex items-center flex-1 max-w-md" ref={searchRef}>
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
            placeholder="Search invoices, customers, products..."
            className="w-full pl-9 pr-12 py-2 rounded-full bg-secondary border-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border font-mono pointer-events-none">
              ⌘K
            </kbd>
          )}

          {/* Search dropdown */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No results for <span className="font-medium text-foreground">"{searchQuery}"</span>
                  </div>
                ) : (
                  <div className="py-2 max-h-80 overflow-y-auto">
                    {grouped.map(({ type, items }) => (
                      <div key={type}>
                        <p className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {typeLabel(type)}s
                        </p>
                        {items.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                              {typeIcon(type)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{result.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{result.sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Link
            to="/dashboard/invoices/new"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Create Invoice
          </Link>
        </div>
        {isPro() ? (
          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Pro ✦</span>
        ) : (
          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">Free</span>
        )}

        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false); }}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Bell size={20} className="text-muted-foreground" />
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-xl shadow-lg z-50 p-4">
              <p className="text-sm font-semibold mb-3">Notifications</p>
              <p className="text-sm text-muted-foreground">No new notifications.</p>
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm cursor-pointer hover:bg-primary/20 transition-colors overflow-hidden"
          >
            {authAvatar ? <img src={authAvatar} alt="avatar" className="w-full h-full object-cover" /> : initial}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-bold truncate">{authName || "Account"}</p>
                <p className="text-xs text-muted-foreground truncate">{authEmail}</p>
              </div>
              <div className="py-1">
                <Link to="/dashboard/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors">
                  <Settings size={15} className="text-muted-foreground" /> Settings
                </Link>
                <Link to="/dashboard/settings?tab=billing" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors">
                  <CreditCard size={15} className="text-muted-foreground" /> Billing
                </Link>
              </div>
              <div className="border-t border-border py-1">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors">
                  <LogOut size={15} /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardTopbar;