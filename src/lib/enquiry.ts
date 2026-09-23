import type { EnquiryStatus, EnquiryType } from "@prisma/client";
import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "NEW_QUERY",
  "QUOTATION_SENT",
  "ON_HOLD",
  "CONVERTED",
  "FOLLOW_UP",
  "LOST",
];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW_QUERY: "New Query",
  QUOTATION_SENT: "Quotation Sent",
  ON_HOLD: "On Hold",
  CONVERTED: "Converted",
  FOLLOW_UP: "Follow Up",
  LOST: "Lost",
};

export const STATUS_BADGE_VARIANT: Record<EnquiryStatus, BadgeVariant> = {
  NEW_QUERY: "blue",
  QUOTATION_SENT: "purple",
  ON_HOLD: "amber",
  CONVERTED: "teal",
  FOLLOW_UP: "cyan",
  LOST: "rose",
};

export const TYPE_LABELS: Record<EnquiryType, string> = {
  HOLIDAY_PACKAGE: "Holiday Package",
  FLIGHT_ONLY: "Flight Only",
  HOTEL_ONLY: "Hotel Only",
  VISA: "Visa",
  OTHER: "Other",
};

export const HOTEL_CATEGORIES = [3, 4, 5] as const;

export const CURRENCIES: { code: string; label: string }[] = [
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "THB", label: "THB — Thai Baht" },
  { code: "LKR", label: "LKR — Sri Lankan Rupee" },
  { code: "MVR", label: "MVR — Maldivian Rufiyaa" },
  { code: "IDR", label: "IDR — Indonesian Rupiah" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "QAR", label: "QAR — Qatari Riyal" },
  { code: "HKD", label: "HKD — Hong Kong Dollar" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "KRW", label: "KRW — South Korean Won" },
  { code: "VND", label: "VND — Vietnamese Dong" },
  { code: "PHP", label: "PHP — Philippine Peso" },
  { code: "EGP", label: "EGP — Egyptian Pound" },
  { code: "TRY", label: "TRY — Turkish Lira" },
  { code: "MUR", label: "MUR — Mauritian Rupee" },
  { code: "SCR", label: "SCR — Seychellois Rupee" },
  { code: "NPR", label: "NPR — Nepalese Rupee" },
  { code: "BDT", label: "BDT — Bangladeshi Taka" },
];

export function formatEnquiryNumber(enquiryNumber: number) {
  return `ENQ-${String(enquiryNumber).padStart(5, "0")}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}
