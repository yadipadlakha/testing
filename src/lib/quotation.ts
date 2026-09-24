import type { QuotationItemCategory } from "@prisma/client";

export const QUOTATION_CATEGORY_LABELS: Record<QuotationItemCategory, string> = {
  HOTEL: "Hotel",
  SIGHTSEEING: "Sightseeing",
  TRANSPORT: "Transport",
  OTHER: "Other",
};

export function computeQuotationTotals(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  taxPercent: number,
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = Math.round((afterDiscount * taxPercent) / 100);
  const total = afterDiscount + tax;
  return { subtotal, afterDiscount, tax, total };
}

export function formatQuotationNumber(quotationNumber: number) {
  return `QTN-${String(quotationNumber).padStart(5, "0")}`;
}
