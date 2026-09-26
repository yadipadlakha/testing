import { datesInRange } from "@/lib/hotel-booking";
import type { HotelBookingDetails } from "@/lib/hotel-booking";
import type { ActivityBookingDetails } from "@/lib/activity-booking";
import type { TransportBookingDetails } from "@/lib/transport-booking";
import type { QuotationItemCategory } from "@prisma/client";

export type DayPlan = {
  dayNumber: number;
  date: string;
  title: string;
  hotel: { name: string; mealPlan: string } | null;
  transfers: { label: string }[];
  activities: { name: string }[];
};

/**
 * Derives a read-only day-by-day itinerary purely from the Hotel/Transport/
 * Activity bookings already added to the quotation — no manual input. A
 * hotel "covers" a day if that day falls within its check-in/check-out
 * range; a transport leg or activity belongs to the day matching its own
 * date field.
 */
export function buildDayWiseItinerary(
  items: { category: QuotationItemCategory; details?: unknown }[],
  travelDateIso: string,
  durationDays: number,
): DayPlan[] {
  const hotelBookings = items
    .filter((i): i is { category: "HOTEL"; details: unknown } => i.category === "HOTEL" && i.details != null)
    .map((i) => i.details as HotelBookingDetails);
  const activityBookings = items
    .filter((i): i is { category: "SIGHTSEEING"; details: unknown } => i.category === "SIGHTSEEING" && i.details != null)
    .map((i) => i.details as ActivityBookingDetails);
  const transportBookings = items
    .filter((i): i is { category: "TRANSPORT"; details: unknown } => i.category === "TRANSPORT" && i.details != null)
    .map((i) => i.details as TransportBookingDetails);

  return datesInRange(travelDateIso, Math.max(1, durationDays)).map((date, index) => {
    const hotel = hotelBookings.find((h) => h.checkIn && h.checkOut && date >= h.checkIn && date < h.checkOut) ?? null;

    const transfers = transportBookings.flatMap((t) =>
      t.legs
        .filter((leg) => leg.date === date && leg.routeId)
        .map((leg) => ({ label: [t.vehicleName, leg.routeName].filter(Boolean).join(" — ") || "Transfer" })),
    );

    const activities = activityBookings
      .filter((a) => a.activityDate === date)
      .map((a) => ({ name: a.activityName || "Activity" }));

    const titleParts = [...transfers.map((t) => t.label), ...activities.map((a) => a.name)];
    const title =
      titleParts.length > 0 ? titleParts.join(" + ") : hotel ? `Stay at ${hotel.hotelName}` : `Day ${index + 1}`;

    return {
      dayNumber: index + 1,
      date,
      title,
      hotel: hotel ? { name: hotel.hotelName, mealPlan: hotel.mealPlan } : null,
      transfers,
      activities,
    };
  });
}
