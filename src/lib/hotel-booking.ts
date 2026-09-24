export type HotelBookingStatus = "AVAILABLE" | "ON_REQUEST" | "NOT_AVAILABLE" | "CONFIRMED";

export const HOTEL_BOOKING_STATUSES: { value: HotelBookingStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ON_REQUEST", label: "On Request" },
  { value: "NOT_AVAILABLE", label: "Not Available" },
  { value: "CONFIRMED", label: "Confirmed" },
];

export type HotelBookingDetails = {
  city: string;
  hotelId: string | null;
  hotelName: string;
  hotelAddress: string;
  alternateHotelId: string | null;
  alternateHotelName: string | null;
  currency: string;
  status: HotelBookingStatus;
  confirmationNumber: string;
  specialRequests: string;
  rateMode: "INVENTORY" | "MANUAL";
  roomCategory: string;
  roomType: string;
  mealPlan: string;
  checkIn: string;
  checkOut: string;
  manualNightlyPrice?: number;
  numberOfRooms: number;
  totalPax: number;
  extraBedAdultQty: number;
  extraBedAdultPrice: number;
  extraBedChildQty: number;
  extraBedChildPrice: number;
  noBedChildQty: number;
  noBedChildPrice: number;
  infantQty: number;
  infantPrice: number;
  additionalChargesDescription: string;
  additionalChargesAmount: number;
  roomSubTotal: number;
  totalCost: number;
};

export function splitCities(travelTo: string): string[] {
  const cities = travelTo
    .split(/[,/]/)
    .map((c) => c.trim())
    .filter(Boolean);
  return cities.length > 0 ? cities : [travelTo.trim()].filter(Boolean);
}

export function hotelMatchesCity(destination: string, city: string): boolean {
  const d = destination.toLowerCase();
  const c = city.toLowerCase();
  return d.includes(c) || c.includes(d);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

export function datesInRange(start: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) dates.push(addDays(start, i));
  return dates;
}

type Season = { id: string; name: string; startDate: string; endDate: string };
type RoomRate = { seasonId: string; roomCategory: string; roomType: string; mealPlan: string; rate: number };
type ExtraRate = { seasonId: string; label: string; rate: number };

export function findSeasonForDate(seasons: Season[], date: string): Season | null {
  const d = new Date(date).getTime();
  return (
    seasons.find((s) => d >= new Date(s.startDate).getTime() && d <= new Date(s.endDate).getTime()) ?? null
  );
}

export function nightlyRate(
  seasons: Season[],
  roomRates: RoomRate[],
  date: string,
  roomCategory: string,
  roomType: string,
  mealPlan: string,
): number | null {
  const season = findSeasonForDate(seasons, date);
  if (!season) return null;
  const match = roomRates.find(
    (r) => r.seasonId === season.id && r.roomCategory === roomCategory && r.roomType === roomType && r.mealPlan === mealPlan,
  );
  return match ? match.rate : null;
}

const EXTRA_LABEL_MATCHERS: { key: "extraBedAdult" | "extraBedChild" | "noBedChild"; test: (label: string) => boolean }[] = [
  { key: "extraBedAdult", test: (l) => /extra bed.*adult/i.test(l) },
  { key: "extraBedChild", test: (l) => /extra bed.*child/i.test(l) },
  { key: "noBedChild", test: (l) => /(no bed|without bed)/i.test(l) },
];

export function defaultExtraPrices(seasons: Season[], extraRates: ExtraRate[], onDate: string) {
  const season = findSeasonForDate(seasons, onDate);
  const result = { extraBedAdult: 0, extraBedChild: 0, noBedChild: 0 };
  if (!season) return result;
  for (const extra of extraRates) {
    if (extra.seasonId !== season.id) continue;
    const matcher = EXTRA_LABEL_MATCHERS.find((m) => m.test(extra.label));
    if (matcher) result[matcher.key] = extra.rate;
  }
  return result;
}

export function computeHotelBookingTotals(draft: HotelBookingDetails, nightlyRates: number[]) {
  const roomSubTotal = nightlyRates.reduce((sum, rate) => sum + rate, 0) * draft.numberOfRooms;
  const nights = nightlyRates.length;
  const extrasTotal =
    draft.extraBedAdultQty * draft.extraBedAdultPrice * nights +
    draft.extraBedChildQty * draft.extraBedChildPrice * nights +
    draft.noBedChildQty * draft.noBedChildPrice * nights +
    draft.infantQty * draft.infantPrice * nights;
  const totalCost = roomSubTotal + extrasTotal + draft.additionalChargesAmount;
  return { roomSubTotal, extrasTotal, totalCost };
}
