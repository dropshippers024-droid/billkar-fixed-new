import { api } from "@/lib/api";

export interface BusinessProfile {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  logoUrl: string;
  signatureUrl: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  businessType: string;
  defaultTemplate: string;
}

const STORAGE_KEY = "billkar_business_profile";

const emptyProfile: BusinessProfile = {
  name: "",
  gstin: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  logoUrl: "",
  signatureUrl: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  upiId: "",
  invoicePrefix: "INV",
  nextInvoiceNumber: 1001,
  businessType: "",
  defaultTemplate: "modern",
};

// ── Sync cache (backward-compat) ───────────────────────────────────────────

export function getBusinessProfile(): BusinessProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyProfile };
    return { ...emptyProfile, ...JSON.parse(raw) };
  } catch {
    return { ...emptyProfile };
  }
}

function cacheProfile(profile: BusinessProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("billkar:profile-updated"));
}

// ── Async API ─────────────────────────────────────────────────────────────

export async function loadBusinessProfile(): Promise<BusinessProfile> {
  try {
    const { business: data } = await api.getBusiness();
    if (!data) return getBusinessProfile();
    const cached = getBusinessProfile();

    const profile: BusinessProfile = {
      ...cached,
      name: data.name || "",
      gstin: data.gstin || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || "",
      phone: data.phone || "",
      email: data.email || "",
      logoUrl: data.logo_url || "",
      signatureUrl: data.signature_url || "",
      bankName: data.bank_name || "",
      accountNumber: data.account_number || "",
      ifsc: data.ifsc || "",
      upiId: data.upi_id || "",
      invoicePrefix: data.invoice_prefix || "INV",
      nextInvoiceNumber: data.next_invoice_number || 1001,
    };

    cacheProfile(profile);
    return profile;
  } catch {
    return getBusinessProfile();
  }
}

export async function saveBusinessProfile(profile: Partial<BusinessProfile>): Promise<void> {
  const current = getBusinessProfile();
  const merged = { ...current, ...profile };
  cacheProfile(merged);

  await api.updateBusiness({
    name: merged.name,
    gstin: merged.gstin,
    address: merged.address,
    city: merged.city,
    state: merged.state,
    pincode: merged.pincode,
    phone: merged.phone,
    email: merged.email,
    logo_url: merged.logoUrl,
    signature_url: merged.signatureUrl,
    bank_name: merged.bankName,
    account_number: merged.accountNumber,
    ifsc: merged.ifsc,
    upi_id: merged.upiId,
    invoice_prefix: merged.invoicePrefix,
    next_invoice_number: merged.nextInvoiceNumber,
  });
}

// Legacy sync setter — updates cache and fires async save to API
export function setBusinessProfile(profile: Partial<BusinessProfile>): void {
  const current = getBusinessProfile();
  cacheProfile({ ...current, ...profile });
  saveBusinessProfile(profile);
}
