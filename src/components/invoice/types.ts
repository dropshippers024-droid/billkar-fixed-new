export interface InvoiceItem {
  id: string;
  name: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  discountValue: number;
  discountType: "percent" | "amount";
  gstPercent: number;
}

export interface CustomerInfo {
  id?: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
}

export interface InvoiceData {
  template: string;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  type: string;
  customer: CustomerInfo;
  items: InvoiceItem[];
  notes: string;
  terms: string;
  businessName: string;
  businessGstin: string;
  businessState: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  originalInvoiceNumber?: string;
  creditReason?: string;
  vehicleNumber?: string;
  transportDetails?: string;
}

export const TEMPLATES = [
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
  { id: "minimal", label: "Minimal" },
  { id: "bold", label: "Bold" },
  { id: "professional", label: "Professional" },
  { id: "elegant", label: "Elegant" },
  { id: "startup", label: "Startup" },
  { id: "compact", label: "Compact" },
];

export const INVOICE_TYPES = [
  "Tax Invoice",
  "Estimate",
  "Proforma Invoice",
  "Credit Note",
  "Delivery Challan",
];

export const UNITS = ["pcs", "kg", "gm", "ltr", "ml", "mtr", "cm", "sqft", "box", "set", "pair", "dozen", "nos", "hrs", "ton", "bag", "roll", "bundle"];

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const emptyItem = (): InvoiceItem => ({
  id: crypto.randomUUID(),
  name: "",
  hsn: "",
  qty: 1,
  unit: "pcs",
  rate: 0,
  discountValue: 0,
  discountType: "percent",
  gstPercent: 18,
});

export const emptyCustomer = (): CustomerInfo => ({
  id: "",
  name: "",
  gstin: "",
  phone: "",
  email: "",
  address: "",
  state: "",
});
