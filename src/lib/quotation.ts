import type { QuotationItemCategory } from "@prisma/client";
import { nightsBetween, type HotelBookingDetails } from "@/lib/hotel-booking";
import { rowTotal, type ActivityBookingDetails } from "@/lib/activity-booking";

export const QUOTATION_CATEGORY_LABELS: Record<QuotationItemCategory, string> = {
  HOTEL: "Hotel",
  SIGHTSEEING: "Activity",
  TRANSPORT: "Transport",
  EXPENSE: "Expense",
  GUIDE: "Guide",
  OTHER: "Other",
};

export function computeQuotationTotals(
  items: { quantity: number; unitPrice: number }[],
  markupPercent: number,
  discount: number,
  taxPercent: number,
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const markup = Math.round((subtotal * markupPercent) / 100);
  const afterMarkup = subtotal + markup;
  const afterDiscount = Math.max(0, afterMarkup - discount);
  const tax = Math.round((afterDiscount * taxPercent) / 100);
  const total = afterDiscount + tax;
  return { subtotal, markup, afterMarkup, afterDiscount, tax, total };
}

export function formatQuotationNumber(quotationNumber: number) {
  return `QTN-${String(quotationNumber).padStart(5, "0")}`;
}

export type PaxSummaryRow = {
  label: "Adult" | "Child" | "Infant";
  pax: number;
  rate: number;
  total: number;
};

/**
 * Builds the "Total Package Summary" — cost split by pax type — for the
 * printed quotation. Adult/child-specific costs (activity rates, hotel extra
 * beds) go straight to that pax type; costs that aren't tied to a specific
 * passenger (room base rate, transport, additional charges, other services)
 * are split evenly per head across adults and children. The whole thing is
 * then scaled so Adult total + Child total + Infant total always equals the
 * quotation's real total, markup/discount/tax included.
 */
export function computePaxSummary(
  items: { category: QuotationItemCategory; quantity: number; unitPrice: number; details: unknown }[],
  pax: { adults: number; children: number },
  quotationTotal: number,
): PaxSummaryRow[] {
  let adultSpecific = 0;
  let childSpecific = 0;
  let infantSpecific = 0;
  let shared = 0;
  let infantPax = 0;

  for (const item of items) {
    const itemTotal = item.quantity * item.unitPrice;
    if (item.category === "HOTEL" && item.details) {
      const d = item.details as HotelBookingDetails;
      const nights = nightsBetween(d.checkIn, d.checkOut);
      const adultPart = d.extraBedAdultQty * d.extraBedAdultPrice * nights;
      const childPart = (d.extraBedChildQty * d.extraBedChildPrice + d.noBedChildQty * d.noBedChildPrice) * nights;
      const infantPart = d.infantQty * d.infantPrice * nights;
      adultSpecific += adultPart;
      childSpecific += childPart;
      infantSpecific += infantPart;
      shared += itemTotal - adultPart - childPart - infantPart;
      infantPax = Math.max(infantPax, d.infantQty);
    } else if (item.category === "SIGHTSEEING" && item.details) {
      const d = item.details as ActivityBookingDetails;
      adultSpecific += rowTotal(d.adultRate, d.adultQty, d.adultAdditionalCost);
      childSpecific += rowTotal(d.childRate, d.childQty, d.childAdditionalCost);
      infantSpecific += rowTotal(d.infantRate, d.infantQty, d.infantAdditionalCost);
      infantPax = Math.max(infantPax, d.infantQty);
    } else {
      shared += itemTotal;
    }
  }

  const sharedHeadcount = pax.adults + pax.children;
  const adultShared = sharedHeadcount > 0 ? (shared * pax.adults) / sharedHeadcount : 0;
  const childShared = sharedHeadcount > 0 ? (shared * pax.children) / sharedHeadcount : 0;

  const rawAdult = adultSpecific + adultShared;
  const rawChild = childSpecific + childShared;
  const rawInfant = infantSpecific;
  const rawSum = rawAdult + rawChild + rawInfant;
  const scale = rawSum > 0 ? quotationTotal / rawSum : 1;

  const rows: PaxSummaryRow[] = [];
  if (pax.adults > 0) {
    const total = rawAdult * scale;
    rows.push({ label: "Adult", pax: pax.adults, rate: total / pax.adults, total });
  }
  if (pax.children > 0) {
    const total = rawChild * scale;
    rows.push({ label: "Child", pax: pax.children, rate: total / pax.children, total });
  }
  if (infantPax > 0) {
    const total = rawInfant * scale;
    rows.push({ label: "Infant", pax: infantPax, rate: total / infantPax, total });
  }
  return rows;
}
