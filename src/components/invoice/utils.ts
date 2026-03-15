import type { InvoiceItem } from "./types";

export function calcItemTaxable(item: InvoiceItem): number {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const discountValue = Number(item.discountValue) || 0;
  const gross = qty * rate;
  const discount =
    item.discountType === "percent"
      ? gross * (discountValue / 100)
      : discountValue;
  return Math.max(gross - discount, 0);
}

export function calcItemTax(item: InvoiceItem): number {
  const gstPercent = Number(item.gstPercent) || 0;
  return calcItemTaxable(item) * (gstPercent / 100);
}

export function calcItemTotal(item: InvoiceItem): number {
  return calcItemTaxable(item) + calcItemTax(item);
}

export function isIntraState(businessState: string, customerState: string): boolean {
  if (!businessState || !customerState) return true;
  return businessState === customerState;
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function toWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
  if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + toWords(n % 100000) : "");
  return toWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + toWords(n % 10000000) : "");
}

export function numberToWords(amount: number): string {
  const safe = Number(amount) || 0;
  const rounded = Math.round(safe);
  if (rounded === 0) return "Zero";
  return "Rupees " + toWords(rounded) + " Only";
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const prefix = "INV";
  const yr = date.getFullYear().toString().slice(-2);
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${yr}${mo}-${rand}`;
}

export function formatCurrency(n: number): string {
  const safe = Number(n) || 0;
  return "₹" + safe.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
