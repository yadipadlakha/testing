import { DAY_LABELS } from "@/lib/sightseeing";
import type { BookingStatus } from "@/lib/hotel-booking";

const DAY_CODES = DAY_LABELS.map((d) => d.code);

export const TRANSFER_OPTIONS: { value: string; label: string }[] = [
  { value: "PRIVATE", label: "Private Transfer" },
  { value: "SHARED", label: "Shared Transfer (SIC)" },
  { value: "NONE", label: "No Transfer" },
];

export const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Full Day"];

export type ActivityBookingDetails = {
  city: string;
  activityId: string | null;
  activityName: string;
  activityCity: string;
  alternateActivityId: string | null;
  alternateActivityName: string | null;
  activityDate: string;
  transferOption: string;
  timeSlot: string;
  currency: string;
  status: BookingStatus;

  adultRate: number;
  adultQty: number;
  adultAdditionalCost: number;
  childRate: number;
  childQty: number;
  childAdditionalCost: number;
  infantRate: number;
  infantQty: number;
  infantAdditionalCost: number;

  subTotal: number;
  grandTotal: number;
};

export type ActivityRateBand = {
  startDate: string;
  endDate: string;
  daysOfWeek: string[];
  adultRate: number | null;
  childRate: number | null;
  infantRate: number | null;
};

export function findActivityRateForDate(rates: ActivityRateBand[], dateIso: string): ActivityRateBand | null {
  const d = new Date(dateIso);
  const dayCode = DAY_CODES[d.getUTCDay()];
  const t = d.getTime();
  return (
    rates.find(
      (r) => t >= new Date(r.startDate).getTime() && t <= new Date(r.endDate).getTime() && r.daysOfWeek.includes(dayCode),
    ) ?? null
  );
}

export function rowTotal(rate: number, qty: number, additionalCost: number): number {
  return rate * qty + additionalCost;
}

export function computeActivityTotals(draft: ActivityBookingDetails) {
  const adultTotal = rowTotal(draft.adultRate, draft.adultQty, draft.adultAdditionalCost);
  const childTotal = rowTotal(draft.childRate, draft.childQty, draft.childAdditionalCost);
  const infantTotal = rowTotal(draft.infantRate, draft.infantQty, draft.infantAdditionalCost);
  const subTotal = adultTotal + childTotal + infantTotal;
  return { adultTotal, childTotal, infantTotal, subTotal, grandTotal: subTotal };
}
