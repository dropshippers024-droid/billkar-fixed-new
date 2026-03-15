import { getCurrentPlan, isTrialActive, isPro } from "@/lib/planStore";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, CreditCard, Users, Bell, Camera, Upload, Check, Eye, EyeOff, Loader2, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { INDIAN_STATES } from "@/components/invoice/types";
import { Switch } from "@/components/ui/switch";
import { getBusinessProfile, saveBusinessProfile } from "@/lib/businessStore";
import { getUser } from "@/lib/authStore";
import { setAdminPro, activateBusinessForTesting, getInvoiceCount, getCurrentPlan, isTrialActive, getTrialDaysLeft, canManageBusiness, isViewer } from "@/lib/planStore";
import { toast } from "sonner";
import UpgradeModal from "@/components/UpgradeModal";
import { api } from "@/lib/api";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) { reject(new Error("Image must be under 2MB")); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "business", label: "Business", icon: Building2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

type TeamMemberRecord = {
  id: string;
  email: string;
  role?: string;
  status?: string;
  full_name?: string;
  avatar_url?: string;
};

const SaveButton = ({ label = "Save Changes" }: { label?: string }) => {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  const handleClick = () => {
    if (state !== "idle") return;
    setState("saving");
    setTimeout(() => {
      setState("done");
      toast.success("Changes saved");
      setTimeout(() => setState("idle"), 1500);
    }, 1000);
  };

  return (
    <button onClick={handleClick} disabled={state !== "idle"}
      className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
        state === "done" ? "bg-emerald-600 text-white" : "bg-accent text-accent-foreground hover:opacity-90",
        state === "saving" && "opacity-80 cursor-wait")}>
      {state === "saving" && <Loader2 size={16} className="animate-spin" />}
      {state === "done" && <Check size={16} />}
      {state === "saving" ? "Saving..." : state === "done" ? "Saved!" : label}
    </button>
  );
};

const ProfileTab = () => {
  const [showPw, setShowPw] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(getUser()?.name || "");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const userEmail = getUser()?.email || "";
  const initial = name.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    api.getMe().then(({ user: u }) => {
      if (u?.avatar_url) setAvatarUrl(u.avatar_url);
      if (u?.full_name) setName(u.full_name);
      if (u?.phone) setPhone(u.phone);
    });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await api.updateProfile({ avatar_url: dataUrl });
      setAvatarUrl(dataUrl);
      // Update localStorage so sidebar picks it up
      try {
        const stored = JSON.parse(localStorage.getItem("billkar_user") || "{}");
        localStorage.setItem("billkar_user", JSON.stringify({ ...stored, avatar_url: dataUrl }));
      } catch {
        localStorage.setItem("billkar_user", JSON.stringify({ avatar_url: dataUrl }));
      }
      window.dispatchEvent(new CustomEvent("billkar:profile-updated"));
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload photo"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const wantsPasswordChange = currentPassword.trim().length > 0 || newPassword.trim().length > 0;
    if (wantsPasswordChange) {
      if (!currentPassword.trim() || !newPassword.trim()) {
        toast.error("Enter both current and new password");
        return;
      }
      if (newPassword.trim().length < 8) {
        toast.error("New password must be at least 8 characters");
        return;
      }
    }

    setSaving(true);
    try {
      await api.updateProfile({ full_name: name, phone });
      await api.updateBusiness({ name });
      if (wantsPasswordChange) {
        await api.changePassword(currentPassword.trim(), newPassword.trim());
        setCurrentPassword("");
        setNewPassword("");
      }
      await saveBusinessProfile({ name });
      // Update localStorage so sidebar picks it up
      try {
        const stored = JSON.parse(localStorage.getItem("billkar_user") || "{}");
        localStorage.setItem("billkar_user", JSON.stringify({ ...stored, full_name: name, name }));
      } catch {
        localStorage.setItem("billkar_user", JSON.stringify({ full_name: name, name }));
      }
      window.dispatchEvent(new CustomEvent("billkar:profile-updated"));
      setSaved(true);
      toast.success("Profile updated");
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : initial}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-border rounded-full flex items-center justify-center shadow-sm z-10 hover:bg-gray-50 cursor-pointer"
          >
            {uploading ? <Loader2 size={12} className="animate-spin text-muted-foreground" /> : <Camera size={14} className="text-foreground" />}
          </button>
        </div>
        <div>
          <h3 className="font-bold">Profile Photo</h3>
          <p className="text-xs text-muted-foreground">JPG or PNG, max 2MB</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <SettingsInput label="Full Name" value={name} onChange={setName} />
        <SettingsField label="Email" defaultValue={userEmail} disabled />
        <SettingsInput label="Phone" value={phone} onChange={setPhone} placeholder="Enter phone number" />
      </div>
      <div className="border-t border-border pt-5">
        <h3 className="font-bold mb-4">Change Password</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Password</label>
            <input type={showPw ? "text" : "password"} placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-7 text-muted-foreground">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">New Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
          saved ? "bg-emerald-600 text-white" : "bg-accent text-accent-foreground hover:opacity-90",
          saving && "opacity-80 cursor-wait")}>
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saved && <Check size={16} />}
        {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
      </button>
    </div>
  );
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const BusinessTab = () => {
  const [p, setP] = useState(() => getBusinessProfile());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const set = (field: string, value: string | number) => setP((prev) => ({ ...prev, [field]: value }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setLogoUploading(true);
    try {
      const url = await fileToDataUrl(file);
      setP((prev) => ({ ...prev, logoUrl: url }));
      await saveBusinessProfile({ logoUrl: url });
      toast.success("Business logo updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload logo"));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveBusinessProfile(p);
      setSaved(true);
      toast.success("Business details saved");
      setTimeout(() => setSaved(false), 1500);
    } catch {
      toast.error("Failed to save business details");
    } finally {
      setSaving(false);
    }
  };

  const gstinInvalid = p.gstin && !GSTIN_REGEX.test(p.gstin);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSignatureUploading(true);
    try {
      const url = await fileToDataUrl(file);
      setP((prev) => ({ ...prev, signatureUrl: url }));
      await saveBusinessProfile({ signatureUrl: url });
      toast.success("Digital signature updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload signature"));
    } finally {
      setSignatureUploading(false);
    }
  };

  return (
  <div className="space-y-6">
    <div>
      <h3 className="font-bold mb-1">Business Logo</h3>
      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
      <div
        onClick={() => logoInputRef.current?.click()}
        className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors cursor-pointer"
      >
        {p.logoUrl ? (
          <img src={p.logoUrl} alt="logo" className="max-h-20 max-w-full object-contain rounded" />
        ) : logoUploading ? (
          <Loader2 size={24} className="text-muted-foreground animate-spin" />
        ) : (
          <>
            <Upload size={24} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Click to upload logo (JPG, PNG, max 2MB)</span>
          </>
        )}
      </div>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <SettingsInput label="Business Name *" value={p.name} onChange={(v) => set("name", v)} />
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">GSTIN</label>
        <input type="text" value={p.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} placeholder="15-character GSTIN"
          className={cn("w-full px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono", gstinInvalid ? "border-destructive" : "border-border")} />
        {gstinInvalid && <p className="text-xs text-destructive mt-1">Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)</p>}
      </div>
      <SettingsInput label="Phone" value={p.phone} onChange={(v) => set("phone", v)} />
      <SettingsInput label="Email" value={p.email} onChange={(v) => set("email", v)} />
      <div className="sm:col-span-2">
        <SettingsInput label="Address" value={p.address} onChange={(v) => set("address", v)} />
      </div>
      <SettingsInput label="City" value={p.city} onChange={(v) => set("city", v)} />
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
        <select value={p.state} onChange={(e) => set("state", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Select State</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <SettingsInput label="Pincode" value={p.pincode} onChange={(v) => set("pincode", v)} maxLength={6} />
    </div>

    <div className="border-t border-border pt-5">
      <h3 className="font-bold mb-1">Digital Signature</h3>
      <input ref={signatureInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSignatureUpload} />
      <div
        onClick={() => signatureInputRef.current?.click()}
        className="w-48 h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center hover:border-primary/40 transition-colors cursor-pointer overflow-hidden"
      >
        {p.signatureUrl ? (
          <img src={p.signatureUrl} alt="signature" className="max-h-full max-w-full object-contain" />
        ) : signatureUploading ? (
          <Loader2 size={20} className="text-muted-foreground animate-spin" />
        ) : (
          <span className="text-xs text-muted-foreground">Upload signature</span>
        )}
      </div>
    </div>

    <div className="border-t border-border pt-5">
      <h3 className="font-bold mb-4">Bank Details</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <SettingsInput label="Bank Name" value={p.bankName} onChange={(v) => set("bankName", v)} />
        <SettingsInput label="Account Number" value={p.accountNumber} onChange={(v) => set("accountNumber", v)} mono />
        <SettingsInput label="IFSC Code" value={p.ifsc} onChange={(v) => set("ifsc", v)} mono />
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            UPI ID
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 leading-none">NEW</span>
          </label>
          <input value={p.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="yourname@upi"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <p className="text-[11px] text-muted-foreground mt-1">Customers can scan a QR code on invoices to pay instantly (Pro)</p>
        </div>
      </div>
    </div>

    <div className="border-t border-border pt-5">
      <h3 className="font-bold mb-4">Invoice Settings</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <SettingsInput label="Invoice Prefix" value={p.invoicePrefix} onChange={(v) => set("invoicePrefix", v)} />
        <SettingsInput label="Starting Number" value={String(p.nextInvoiceNumber)} onChange={(v) => set("nextInvoiceNumber", Number(v) || 1001)} type="number" />
      </div>
    </div>
    <button onClick={handleSave} disabled={saving}
      className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
        saved ? "bg-emerald-600 text-white" : "bg-accent text-accent-foreground hover:opacity-90",
        saving && "opacity-80 cursor-wait")}>
      {saving && <Loader2 size={16} className="animate-spin" />}
      {saved && <Check size={16} />}
      {saving ? "Saving..." : saved ? "Saved!" : "Save Business Info"}
    </button>
  </div>
  );
};

const BillingTab = () => {
  const proClicksRef = useRef(0);
  const proLastClickRef = useRef(0);
  const bizClicksRef = useRef(0);
  const bizLastClickRef = useRef(0);
  const [annual, setAnnual] = useState(true);
  const invoiceCount = getInvoiceCount();
  const plan = getCurrentPlan();
  const trial = isTrialActive();
  const trialDaysLeft = getTrialDaysLeft();
  const invoicePercent = plan === "free" && !trial ? Math.min((invoiceCount / 50) * 100, 100) : 0;
  const limitReached = plan === "free" && !trial && invoiceCount >= 50;

  const planLabel = plan === "pro" ? "Pro Plan" : plan === "business" ? "Business Plan" : trial ? "Pro Trial" : "Free Plan";

  const handleProDevClick = () => {
    const now = Date.now();
    if (now - proLastClickRef.current > 2000) { proClicksRef.current = 1; }
    else {
      proClicksRef.current += 1;
      if (proClicksRef.current >= 5) {
        setAdminPro();
        toast.success("Pro plan activated for testing");
        proClicksRef.current = 0;
      }
    }
    proLastClickRef.current = now;
  };

  const handleBizDevClick = () => {
    const now = Date.now();
    if (now - bizLastClickRef.current > 2000) { bizClicksRef.current = 1; }
    else {
      bizClicksRef.current += 1;
      if (bizClicksRef.current >= 5) {
        activateBusinessForTesting();
        toast.success("Business plan activated for testing");
        bizClicksRef.current = 0;
      }
    }
    bizLastClickRef.current = now;
  };

  const plans = [
    { name: "Free", monthly: 0, annual: 0, color: "gray", current: plan === "free" && !trial, features: ["50 invoices/month", "3 templates", "PDF download", "WhatsApp + Email sharing", "Expense tracking", "No watermark", "1 user", "Email support"] },
    { name: "Pro", monthly: 399, annual: 299, color: "emerald", current: plan === "pro" || trial, features: ["Unlimited invoices", "8 premium templates", "UPI QR on invoices", "Payment reminders", "Recurring invoices", "GSTR-1 export", "3 team members", "Priority support"] },
    { name: "Business", monthly: 799, annual: 599, color: "indigo", badge: "Best for Teams", current: plan === "business", features: ["Everything in Pro", "10 team members", "Excel + PDF report exports", "Multi-business (up to 5)", "Priority WhatsApp support"] },
  ];

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {trial && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-amber-800">Pro Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining</p>
            <button onClick={() => { window.location.href = "/#pricing"; }} className="text-xs font-semibold text-amber-700 underline">Upgrade Now</button>
          </div>
          <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${((7 - trialDaysLeft) / 7) * 100}%` }} />
          </div>
          <p className="text-xs text-amber-700 mt-1.5">All Pro features are unlocked. Upgrade to keep access after trial ends.</p>
        </div>
      )}

      {/* Invoice limit warning */}
      {limitReached && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-1">Invoice limit reached</p>
          <p className="text-xs text-red-700">You've used all 50 free invoices this month. Upgrade to Pro for unlimited invoices.</p>
          <button onClick={() => { window.location.href = "/#pricing"; }}
            className="mt-2 text-xs font-semibold bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
            Upgrade Now
          </button>
        </div>
      )}

      {/* Current plan summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold cursor-default select-none">{planLabel}</h3>
            <p className="text-xs text-muted-foreground">Current billing period</p>
          </div>
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
            limitReached ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary")}>
            {limitReached ? "Limit Reached" : "Active"}
          </span>
        </div>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Invoices used</span>
          <span className={cn("font-medium", limitReached && "text-red-600")}>
            {invoiceCount}{plan === "free" && !trial ? " / 50" : " (unlimited)"}
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", limitReached ? "bg-red-500" : "bg-primary")}
            style={{ width: plan === "free" && !trial ? `${invoicePercent}%` : "100%" }} />
        </div>
        {plan === "free" && !trial && !limitReached && invoiceCount > 35 && (
          <p className="text-xs text-amber-600 mt-2">You're approaching your monthly limit. Consider upgrading for unlimited invoices.</p>
        )}
      </div>

      {/* Annual / Monthly toggle */}
      <div className="flex items-center justify-center gap-2">
        <div className="inline-flex items-center bg-secondary rounded-xl p-1">
          <button onClick={() => setAnnual(false)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              !annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            Monthly
          </button>
          <button onClick={() => setAnnual(true)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            Annual
          </button>
        </div>
        {annual && <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">Save 25%</span>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => {
          const price = annual ? p.annual : p.monthly;
          return (
            <div key={p.name} className={cn("rounded-xl border p-5 transition-all relative",
              p.current ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30")}>
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-indigo-600 text-white px-3 py-0.5 rounded-full">
                  {p.badge}
                </span>
              )}
              <h4 className="font-bold cursor-default select-none"
                onClick={p.name === "Pro" ? handleProDevClick : p.name === "Business" ? handleBizDevClick : undefined}>
                {p.name}
              </h4>
              <p className="text-2xl font-extrabold mt-1">
                {fmt(price)}
                {price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
              </p>
              {price === 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">50 invoices/month included</p>
              )}
              {price > 0 && annual && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="line-through">{fmt(p.monthly)}/mo</span> · billed at {fmt(price * 12)}/yr
                </p>
              )}
              {price > 0 && !annual && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  or {fmt(p.annual)}/mo billed annually
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className={cn("flex-shrink-0",
                      p.color === "emerald" ? "text-emerald-600" : p.color === "indigo" ? "text-indigo-600" : "text-primary")} />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { if (!p.current) window.location.href = "/#pricing"; }}
                className={cn("w-full mt-4 py-2 rounded-xl text-sm font-semibold transition-opacity",
                  p.current
                    ? "bg-secondary text-muted-foreground cursor-default"
                    : p.color === "emerald"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : p.color === "indigo"
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-accent text-accent-foreground hover:opacity-90")}
              >
                {p.current ? "Current Plan" : trial ? "Upgrade" : "Start 7-Day Trial"}
              </button>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="font-bold mb-3">Payment History</h3>
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Amount</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border last:border-0">
                <td className="py-3 px-4">{plan === "free" ? "Free plan" : "—"}</td>
                <td className="py-3 px-4 font-semibold">₹0</td>
                <td className="py-3 px-4"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: "bg-indigo-100 text-indigo-700",
  admin: "bg-blue-100 text-blue-700",
  staff: "bg-emerald-100 text-emerald-700",
  viewer: "bg-gray-100 text-gray-600",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

const TeamTab = () => {
  const user = getUser();
  const plan = getCurrentPlan();
  const trial = isTrialActive();
  const isFree = plan === "free" && !trial;
  const effectivePlan = trial ? "pro" : plan;
  const maxMembers = effectivePlan === "business" ? 10 : effectivePlan === "pro" ? 3 : 1;
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTeam = async () => {
    try {
      const data = await api.getTeam();
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch {
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const ownerEntry = { id: "owner", name: user?.name || "You", email: user?.email || "", role: "owner", status: "active", isOwner: true };
  const allMembers = [ownerEntry, ...teamMembers.map((m) => ({
    id: m.id,
    name: m.full_name || m.email.split("@")[0],
    email: m.email,
    role: m.role || "staff",
    status: m.status || "pending",
    isOwner: false,
  }))];
  const totalCount = allMembers.length;
  const atLimit = totalCount >= maxMembers;

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    if (atLimit) { toast.error(`Team member limit reached (${maxMembers}). Upgrade to add more members.`); return; }
    setInviting(true);
    try {
      const result = await api.inviteTeamMember({ email, role: inviteRole });
      toast.success(result.message || `Invite created for ${email}`);
      setLastInviteLink(result.inviteLink || null);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send invite"));
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (!lastInviteLink) return;
    navigator.clipboard.writeText(lastInviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!lastInviteLink) return;
    const bizName = user?.name ? `${user.name}'s team` : "our team";
    const text = `You're invited to join ${bizName} on BillKar! Click here to join: ${lastInviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleRemove = async (id: string) => {
    try {
      await api.removeTeamMember(id);
      toast.success("Member removed");
      setConfirmRemove(null);
      fetchTeam();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to remove member"));
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.updateTeamMember(id, { role: newRole });
      toast.success("Role updated");
      fetchTeam();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update role"));
    }
  };

  return (
    <div className="space-y-6">
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="team" />

      {/* Confirm remove dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmRemove(null)}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-2">Remove team member?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Remove <span className="font-medium text-gray-700">{confirmRemove.name}</span> from your team? They will lose access immediately.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleRemove(confirmRemove.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + plan limit */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
          <span className="text-sm text-muted-foreground font-medium">
            {totalCount}/{maxMembers} members used
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", atLimit ? "bg-amber-500" : "bg-indigo-500")}
            style={{ width: `${Math.min((totalCount / maxMembers) * 100, 100)}%` }} />
        </div>
        {atLimit && !isFree && (
          <p className="text-xs text-amber-600 mt-1.5 font-medium">
            Team limit reached.{" "}
            <button onClick={() => window.location.href = "/#pricing"} className="text-indigo-600 hover:underline">Upgrade to add more members</button>
          </p>
        )}
      </div>

      {/* Free plan locked state */}
      {isFree ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <Users size={32} className="mx-auto text-gray-400 mb-3" />
          <h4 className="font-bold text-gray-900 mb-1">Upgrade to Pro to invite team members</h4>
          <p className="text-sm text-gray-500 mb-4">Pro plan includes up to 3 team members. Business plan includes up to 10.</p>
          <button onClick={() => setUpgradeOpen(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Upgrade Plan
          </button>
        </div>
      ) : (
        <>
          {/* Invite section */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-semibold text-gray-900 mb-3">Invite Member</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                placeholder="colleague@business.com"
                disabled={inviting || atLimit}
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={inviting || atLimit}
                className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="admin">Admin — Edit settings, manage team</option>
                <option value="staff">Staff — Create invoices, manage data</option>
                <option value="viewer">Viewer — View only (read-only)</option>
              </select>
              <button
                onClick={handleSendInvite}
                disabled={inviting || atLimit || !inviteEmail.trim()}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                  atLimit
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700",
                  inviting && "opacity-80 cursor-wait"
                )}
              >
                {inviting ? <><Loader2 size={14} className="inline animate-spin mr-1.5" />Sending...</> : "Send Invite"}
              </button>
            </div>
            {atLimit && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                You've used all {maxMembers} team slots.{" "}
                <button onClick={() => window.location.href = "/#pricing"} className="text-indigo-600 hover:underline">
                  {effectivePlan === "pro" ? "Upgrade to Business for 10 members" : "Upgrade"}
                </button>
              </p>
            )}

            {/* Invite link share box */}
            {lastInviteLink && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-indigo-900 mb-2">Invite link created!</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={lastInviteLink}
                    className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 text-xs bg-white text-gray-700 font-mono"
                  />
                  <button onClick={handleCopyLink}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
                    {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-xs text-indigo-600">Share this link with your team member</p>
                  <button onClick={handleWhatsAppShare}
                    className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                    <Share2 size={12} />WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 size={20} className="mx-auto text-gray-400 animate-spin mb-2" />
                <p className="text-sm text-gray-400">Loading team...</p>
              </div>
            ) : allMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-4 px-5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0", getAvatarColor(m.email))}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.name}{m.isOwner ? " (You)" : ""}
                      </p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ROLE_BADGE_STYLES[m.role] || ROLE_BADGE_STYLES.staff)}>
                        {ROLE_LABELS[m.role] || "Staff"}
                      </span>
                      {m.status === "active" && !m.isOwner && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>
                      )}
                      {m.status === "pending" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Invited</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                    {m.status === "pending" && (
                      <p className="text-xs text-gray-400 italic mt-0.5">Waiting to join...</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {!m.isOwner && (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => setConfirmRemove({ id: m.id, name: m.name })}
                        className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const NotificationsTab = () => {
  const plan = getCurrentPlan();
  const pro = plan !== "free" || isTrialActive();
  const [emailPaid, setEmailPaid] = useState(true);
  const [emailOverdue, setEmailOverdue] = useState(true);
  const [emailWeekly, setEmailWeekly] = useState(false);
  const [waPaid, setWaPaid] = useState(false);
  const [waReminder, setWaReminder] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const ToggleRow = ({ label, desc, checked, onChange, disabled, badge }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; badge?: string }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", disabled && "text-muted-foreground")}>{label}</p>
          {badge && <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {disabled ? (
        <button onClick={() => setUpgradeOpen(true)} className="text-xs font-semibold text-indigo-600 hover:underline">Upgrade</button>
      ) : (
        <Switch checked={checked} onCheckedChange={onChange} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="reminder" />
      <div>
        <h3 className="font-bold mb-1">Email Notifications</h3>
        <p className="text-xs text-muted-foreground mb-3">Manage what emails you receive</p>
        <div className="bg-background rounded-xl border border-border px-4 divide-y divide-border">
          <ToggleRow label="Invoice Paid" desc="Get notified when a customer pays" checked={emailPaid} onChange={setEmailPaid} />
          <ToggleRow label="Overdue Invoices" desc="Alert when invoices pass due date" checked={emailOverdue} onChange={setEmailOverdue} />
          <ToggleRow label="Weekly Summary" desc="Revenue and activity digest every Monday" checked={emailWeekly} onChange={setEmailWeekly} />
        </div>
      </div>
      <div>
        <h3 className="font-bold mb-1">WhatsApp Notifications</h3>
        <p className="text-xs text-muted-foreground mb-3">Get alerts on WhatsApp for important events</p>
        <div className="bg-background rounded-xl border border-border px-4 divide-y divide-border">
          <ToggleRow label="Invoice Paid" desc="WhatsApp alert on payment received" checked={waPaid} onChange={setWaPaid} />
          <ToggleRow label="Payment Reminders" desc="Auto-remind customers before due date" checked={waReminder} onChange={setWaReminder} disabled={!pro} badge={!pro ? "PRO" : undefined} />
        </div>
      </div>
      <SaveButton label="Save Notifications" />
    </div>
  );
};

const SettingsField = ({ label, defaultValue, placeholder, type = "text", disabled, maxLength, mono }: {
  label: string; defaultValue?: string; placeholder?: string; type?: string; disabled?: boolean; maxLength?: number; mono?: boolean;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <input type={type} defaultValue={defaultValue} placeholder={placeholder} disabled={disabled} maxLength={maxLength}
      className={cn("w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed", mono && "font-mono")} />
  </div>
);

const SettingsInput = ({ label, value, onChange, placeholder, type = "text", maxLength, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number; mono?: boolean;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
      className={cn("w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20", mono && "font-mono")} />
  </div>
);

const Settings = () => {
  const canManage = canManageBusiness();
  const viewerOnly = isViewer();

  // Filter tabs based on role: viewers only see Profile, staff sees Profile + Notifications
  const visibleTabs = tabs.filter((t) => {
    if (viewerOnly) return t.id === "profile";
    if (!canManage) return t.id !== "business" && t.id !== "billing" && t.id !== "team";
    return true;
  });

  const [active, setActive] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    const validIds = visibleTabs.map((t) => t.id);
    return validIds.includes(tab || "") ? tab! : visibleTabs[0]?.id || "profile";
  });

  const renderTab = () => {
    switch (active) {
      case "profile": return <ProfileTab />;
      case "business": return canManage ? <BusinessTab /> : null;
      case "billing": return canManage ? <BillingTab /> : null;
      case "team": return canManage ? <TeamTab /> : null;
      case "notifications": return <NotificationsTab />;
      default: return null;
    }
  };

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-extrabold mb-6">Settings</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Vertical tabs - horizontal on mobile */}
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-48 flex-shrink-0 pb-2 md:pb-0">
            {visibleTabs.map((t) => (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  active === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary")}>
                <t.icon size={16} />{t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 bg-background rounded-2xl border border-border shadow-sm p-5 md:p-6 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </DashboardShell>
  );
};

export default Settings;
