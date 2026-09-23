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
