import { prisma } from "@/lib/prisma";
import {
  splitCities,
  matchesCity,
  addDays,
  nightsBetween,
  datesInRange,
  nightlyRate,
  defaultExtraPrices,
  computeHotelBookingTotals,
  type HotelBookingDetails,
} from "@/lib/hotel-booking";
import {
  findActivityRateForDate,
  computeActivityTotals,
  type ActivityBookingDetails,
  type ActivityRateBand,
} from "@/lib/activity-booking";
import { computeRouteCost, totalTransportCost, type TransportBookingDetails, type TransportLeg } from "@/lib/transport-booking";
import type { Hotel, HotelSeason, HotelRoomRate, HotelExtraRate, Transport, Prisma } from "@prisma/client";

type HotelWithRates = Hotel & { seasons: (HotelSeason & { roomRates: HotelRoomRate[]; extraRates: HotelExtraRate[] })[] };

/**
 * Splits the enquiry's total trip length across its cities, front-loading
 * any remainder onto the earlier cities (6 days / 2 cities -> [3, 3];
 * 7 days / 2 cities -> [4, 3]). Caps the number of cities used at the
 * number of days available, so every city segment gets at least one night.
 */
function splitDurationAcrossCities(totalDays: number, cityCount: number): number[] {
  const n = Math.min(cityCount, Math.max(1, totalDays));
  const base = Math.floor(totalDays / n);
  const remainder = totalDays % n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

function bestRoomComboForHotel(hotel: HotelWithRates, stayDates: string[]) {
  const seasons = hotel.seasons.map((s) => ({ id: s.id, name: s.name, startDate: s.startDate.toISOString(), endDate: s.endDate.toISOString() }));
  const roomRates = hotel.seasons.flatMap((s) => s.roomRates);

  const combos = new Map<string, { roomCategory: string; roomType: string; mealPlan: string }>();
  for (const r of roomRates) {
    const key = `${r.roomCategory}|${r.roomType}|${r.mealPlan}`;
    if (!combos.has(key)) combos.set(key, { roomCategory: r.roomCategory, roomType: r.roomType, mealPlan: r.mealPlan });
  }

  let best: { combo: { roomCategory: string; roomType: string; mealPlan: string }; nightlyRates: number[]; total: number } | null = null;
  for (const combo of combos.values()) {
    const rates: number[] = [];
    let covered = true;
    for (const date of stayDates) {
      const rate = nightlyRate(seasons, roomRates, date, combo.roomCategory, combo.roomType, combo.mealPlan);
      if (rate == null) {
        covered = false;
        break;
      }
      rates.push(rate);
    }
    if (!covered) continue;
    const total = rates.reduce((sum, r) => sum + r, 0);
    if (!best || total < best.total) best = { combo, nightlyRates: rates, total };
  }
  return best;
}

/**
 * Picks the cheapest hotel in `city` that has a room-rate combo covering
 * every night of the stay. Prefers hotels matching `hotelCategory` (star
 * rating) when one is set, falling back to any matching city if none of
 * that category has full-night coverage. Never falls back to a hotel in a
 * different city — an unmatched city is better left empty than wrong.
 */
async function pickHotelForCity(
  city: string,
  checkIn: string,
  checkOut: string,
  hotelCategory: number | null,
  adults: number,
  children: number,
): Promise<HotelBookingDetails | null> {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return null;
  const stayDates = datesInRange(checkIn, nights);

  const allHotels = await prisma.hotel.findMany({
    include: { seasons: { include: { roomRates: true, extraRates: true } } },
  });
  const cityMatches = allHotels.filter((h) => matchesCity(h.destination, city));
  if (cityMatches.length === 0) return null;

  const categoryMatches = hotelCategory != null ? cityMatches.filter((h) => h.starRating === hotelCategory) : [];
  const candidates = categoryMatches.length > 0 ? categoryMatches : cityMatches;

  let best: { hotel: HotelWithRates; combo: { roomCategory: string; roomType: string; mealPlan: string }; nightlyRates: number[]; total: number } | null = null;
  for (const hotel of candidates) {
    const result = bestRoomComboForHotel(hotel, stayDates);
    if (!result) continue;
    if (!best || result.total < best.total) best = { hotel, ...result };
  }
  if (!best) return null;

  const extras = defaultExtraPrices(
    best.hotel.seasons.map((s) => ({ id: s.id, name: s.name, startDate: s.startDate.toISOString(), endDate: s.endDate.toISOString() })),
    best.hotel.seasons.flatMap((s) => s.extraRates),
    checkIn,
  );

  const draft: HotelBookingDetails = {
    city,
    hotelId: best.hotel.id,
    hotelName: best.hotel.name,
    hotelAddress: best.hotel.address ?? "",
    alternateHotelId: null,
    alternateHotelName: null,
    currency: best.hotel.currency,
    status: "ON_REQUEST",
    confirmationNumber: "",
    specialRequests: "",
    rateMode: "INVENTORY",
    roomCategory: best.combo.roomCategory,
    roomType: best.combo.roomType,
    mealPlan: best.combo.mealPlan,
    checkIn,
    checkOut,
    numberOfRooms: 1,
    totalPax: adults + children,
    extraBedAdultQty: 0,
    extraBedAdultPrice: extras.extraBedAdult,
    extraBedChildQty: 0,
    extraBedChildPrice: extras.extraBedChild,
    noBedChildQty: 0,
    noBedChildPrice: extras.noBedChild,
    infantQty: 0,
    infantPrice: 0,
    additionalChargesDescription: "",
    additionalChargesAmount: 0,
    roomSubTotal: 0,
    totalCost: 0,
  };
  const totals = computeHotelBookingTotals(draft, best.nightlyRates);
  draft.roomSubTotal = totals.roomSubTotal;
  draft.totalCost = totals.totalCost;
  return draft;
}

/**
 * Picks one activity per day of the city segment from whatever Sightseeing
 * rows match that city, cycling through the matches so consecutive days
 * don't repeat the same activity when more than one option exists.
 */
async function pickActivitiesForCity(
  city: string,
  dates: string[],
  adults: number,
  children: number,
  currency: string,
): Promise<ActivityBookingDetails[]> {
  const allActivities = await prisma.sightseeing.findMany({ include: { rates: true } });
  const matches = allActivities.filter((a) => matchesCity(a.city, city) || matchesCity(a.country, city));
  if (matches.length === 0) return [];

  return dates.map((date, i) => {
    const activity = matches[i % matches.length];
    const rateBands: ActivityRateBand[] = activity.rates.map((r) => ({
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      daysOfWeek: r.daysOfWeek,
      adultRate: r.adultRate,
      childRate: r.childRate,
      infantRate: r.infantRate,
    }));
    const rate = findActivityRateForDate(rateBands, date);

    const draft: ActivityBookingDetails = {
      city,
      activityId: activity.id,
      activityName: activity.name,
      activityCity: activity.city,
      alternateActivityId: null,
      alternateActivityName: null,
      activityDate: date,
      transferOption: "PRIVATE",
      timeSlot: "Morning",
      currency,
      status: "ON_REQUEST",
      adultRate: rate?.adultRate ?? activity.price ?? 0,
      adultQty: adults,
      adultAdditionalCost: 0,
      childRate: rate?.childRate ?? 0,
      childQty: children,
      childAdditionalCost: 0,
      infantRate: rate?.infantRate ?? 0,
      infantQty: 0,
      infantAdditionalCost: 0,
      subTotal: 0,
      grandTotal: 0,
    };
    const totals = computeActivityTotals(draft);
    draft.subTotal = totals.subTotal;
    draft.grandTotal = totals.grandTotal;
    return draft;
  });
}

/**
 * Matches a transport route to a city by checking whether the city name
 * appears in the route's free-text name or its destinations list — the
 * best available signal, since TransportRoute has no structured
 * origin/destination city fields today. Adds one arrival-transfer leg per
 * city segment, grouped by vehicle (a TransportBookingDetails item is one
 * vehicle with possibly several legs), using the cheapest matching
 * route+vehicle combination per city.
 */
async function pickTransportLegs(
  segments: { city: string; checkIn: string }[],
): Promise<TransportBookingDetails[]> {
  const routes = await prisma.transportRoute.findMany({
    include: { routePricing: { include: { transport: true } } },
  });

  const legsByVehicle = new Map<string, { vehicle: Transport; legs: TransportLeg[] }>();

  for (const segment of segments) {
    const matches = routes.filter(
      (r) => matchesCity(r.name, segment.city) || r.destinations.some((d) => matchesCity(d, segment.city)),
    );
    if (matches.length === 0) continue;

    let best: { routeId: string; routeName: string; vehicle: Transport; cost: number } | null = null;
    for (const route of matches) {
      for (const pricing of route.routePricing) {
        const cost = computeRouteCost(pricing, route.actualDistanceKm);
        if (!best || cost < best.cost) {
          best = { routeId: route.id, routeName: route.name, vehicle: pricing.transport, cost };
        }
      }
    }
    if (!best) continue;

    const key = best.vehicle.id;
    if (!legsByVehicle.has(key)) legsByVehicle.set(key, { vehicle: best.vehicle, legs: [] });
    legsByVehicle.get(key)!.legs.push({
      id: crypto.randomUUID(),
      routeId: best.routeId,
      routeName: best.routeName,
      date: segment.checkIn,
      cost: best.cost,
    });
  }

  return Array.from(legsByVehicle.values()).map(({ vehicle, legs }) => ({
    vehicleType: vehicle.vehicleType,
    subType: vehicle.subType ?? "",
    vehicleId: vehicle.id,
    vehicleName: vehicle.title,
    acType: vehicle.acType,
    seats: vehicle.seats,
    legs,
  }));
}

/**
 * Builds a draft Quotation for a freshly-created Enquiry by auto-selecting
 * matching hotel, sightseeing, and transport inventory for each city in its
 * (possibly multi-city) destination — no manual drag-and-drop needed. Never
 * throws for "nothing matched": returns null so the caller can proceed with
 * enquiry creation regardless (this is a best-effort convenience draft, not
 * a required step), and only ever falls back within the same city — an
 * unmatched city is left empty rather than filled with the wrong place.
 */
export async function autoGenerateQuotation(enquiryId: string, createdById: string): Promise<string | null> {
  const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) return null;

  const cities = splitCities(enquiry.travelTo);
  const dayCounts = splitDurationAcrossCities(enquiry.durationDays, cities.length);
  const usedCities = cities.slice(0, dayCounts.length);

  let cursor = enquiry.travelDate.toISOString().slice(0, 10);
  const segments = usedCities.map((city, i) => {
    const checkIn = cursor;
    const checkOut = addDays(checkIn, dayCounts[i]);
    cursor = checkOut;
    return { city, checkIn, checkOut };
  });

  const items: { category: "HOTEL" | "SIGHTSEEING" | "TRANSPORT"; description: string; unitPrice: number; details: unknown }[] = [];

  for (const segment of segments) {
    const hotel = await pickHotelForCity(segment.city, segment.checkIn, segment.checkOut, enquiry.hotelCategory, enquiry.adults, enquiry.children);
    if (hotel) {
      items.push({
        category: "HOTEL",
        description: `${hotel.hotelName}, ${hotel.city}`,
        unitPrice: Math.round(hotel.totalCost),
        details: hotel,
      });
    }

    const nights = nightsBetween(segment.checkIn, segment.checkOut);
    const dates = datesInRange(segment.checkIn, nights);
    const activities = await pickActivitiesForCity(segment.city, dates, enquiry.adults, enquiry.children, enquiry.currency);
    for (const activity of activities) {
      items.push({
        category: "SIGHTSEEING",
        description: activity.activityName,
        unitPrice: Math.round(activity.grandTotal),
        details: activity,
      });
    }
  }

  const transportItems = await pickTransportLegs(segments);
  for (const transport of transportItems) {
    items.push({
      category: "TRANSPORT",
      description: transport.vehicleName,
      unitPrice: Math.round(totalTransportCost(transport.legs)),
      details: transport,
    });
  }

  if (items.length === 0) return null;

  const nights = Math.max(0, enquiry.durationDays - 1);
  const quotation = await prisma.quotation.create({
    data: {
      enquiryId,
      title: `${nights}N/${enquiry.durationDays}D — ${enquiry.travelTo} (Auto-generated draft)`,
      currency: enquiry.currency,
      createdById,
      items: {
        create: items.map((item, index) => ({
          category: item.category,
          description: item.description,
          quantity: 1,
          unitPrice: item.unitPrice,
          sortOrder: index,
          details: item.details as Prisma.InputJsonValue,
        })),
      },
    },
  });

  return quotation.id;
}
