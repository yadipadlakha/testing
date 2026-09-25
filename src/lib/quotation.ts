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

export type PrintableLineItem = {
  category: QuotationItemCategory;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

/**
 * Expands a Hotel/Activity booking's single stored line item into one row per
 * passenger type (and extra bed usage) so the printed quotation shows
 * per-adult/per-child pricing and extra-bed charges transparently, instead of
 * one opaque lump sum. Other categories pass through unchanged.
 */
export function buildPrintableLineItems(
  items: { category: QuotationItemCategory; description: string; quantity: number; unitPrice: number; details: unknown }[],
): PrintableLineItem[] {
  const rows: PrintableLineItem[] = [];
  for (const item of items) {
    if (item.category === "HOTEL" && item.details) {
      rows.push(...expandHotelItem(item.details as HotelBookingDetails, item.description));
    } else if (item.category === "SIGHTSEEING" && item.details) {
      rows.push(...expandActivityItem(item.details as ActivityBookingDetails, item.description));
    } else {
      rows.push({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      });
    }
  }
  return rows;
}

function expandHotelItem(details: HotelBookingDetails, fallbackDescription: string): PrintableLineItem[] {
  const nights = nightsBetween(details.checkIn, details.checkOut);
  const rows: PrintableLineItem[] = [];

  const roomLabel = [details.roomCategory, details.roomType].filter(Boolean).join(" · ");
  rows.push({
    category: "HOTEL",
    description: `${details.hotelName || fallbackDescription}${roomLabel ? ` — ${roomLabel}` : ""}${details.mealPlan ? `, ${details.mealPlan}` : ""}, ${nights} night${nights !== 1 ? "s" : ""} × ${details.numberOfRooms} room${details.numberOfRooms !== 1 ? "s" : ""}`,
    quantity: details.numberOfRooms,
    unitPrice: details.numberOfRooms > 0 ? details.roomSubTotal / details.numberOfRooms : details.roomSubTotal,
    total: details.roomSubTotal,
  });

  if (details.extraBedAdultQty > 0) {
    rows.push({
      category: "HOTEL",
      description: "Extra Bed — Adult",
      quantity: details.extraBedAdultQty,
      unitPrice: details.extraBedAdultPrice * nights,
      total: details.extraBedAdultQty * details.extraBedAdultPrice * nights,
    });
  }
  if (details.extraBedChildQty > 0) {
    rows.push({
      category: "HOTEL",
      description: "Extra Bed — Child",
      quantity: details.extraBedChildQty,
      unitPrice: details.extraBedChildPrice * nights,
      total: details.extraBedChildQty * details.extraBedChildPrice * nights,
    });
  }
  if (details.noBedChildQty > 0) {
    rows.push({
      category: "HOTEL",
      description: "Child (No Extra Bed)",
      quantity: details.noBedChildQty,
      unitPrice: details.noBedChildPrice * nights,
      total: details.noBedChildQty * details.noBedChildPrice * nights,
    });
  }
  if (details.infantQty > 0) {
    rows.push({
      category: "HOTEL",
      description: "Infant",
      quantity: details.infantQty,
      unitPrice: details.infantPrice * nights,
      total: details.infantQty * details.infantPrice * nights,
    });
  }
  if (details.additionalChargesAmount > 0) {
    rows.push({
      category: "HOTEL",
      description: details.additionalChargesDescription || "Additional Charges",
      quantity: 1,
      unitPrice: details.additionalChargesAmount,
      total: details.additionalChargesAmount,
    });
  }

  return rows;
}

function expandActivityItem(details: ActivityBookingDetails, fallbackDescription: string): PrintableLineItem[] {
  const base = details.activityName || fallbackDescription;
  const rows: PrintableLineItem[] = [];

  if (details.adultQty > 0) {
    const total = rowTotal(details.adultRate, details.adultQty, details.adultAdditionalCost);
    rows.push({ category: "SIGHTSEEING", description: `${base} — Adult`, quantity: details.adultQty, unitPrice: total / details.adultQty, total });
  }
  if (details.childQty > 0) {
    const total = rowTotal(details.childRate, details.childQty, details.childAdditionalCost);
    rows.push({ category: "SIGHTSEEING", description: `${base} — Child`, quantity: details.childQty, unitPrice: total / details.childQty, total });
  }
  if (details.infantQty > 0) {
    const total = rowTotal(details.infantRate, details.infantQty, details.infantAdditionalCost);
    rows.push({ category: "SIGHTSEEING", description: `${base} — Infant`, quantity: details.infantQty, unitPrice: total / details.infantQty, total });
  }

  if (rows.length === 0) {
    rows.push({ category: "SIGHTSEEING", description: base, quantity: 1, unitPrice: details.grandTotal, total: details.grandTotal });
  }

  return rows;
}
