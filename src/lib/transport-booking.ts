import { addDays } from "@/lib/hotel-booking";

export type TransportLeg = {
  id: string;
  routeId: string | null;
  routeName: string;
  date: string;
  cost: number;
};

export type TransportBookingDetails = {
  vehicleType: string;
  subType: string;
  vehicleId: string | null;
  vehicleName: string;
  acType: string;
  seats: number | null;
  legs: TransportLeg[];
};

export type RoutePricing = {
  pricePerKm: number | null;
  nightCharge: number | null;
  tollTax: number | null;
  driverAllowance: number | null;
  totalPrice: number | null;
};

export function buildDefaultLegs(startDate: string, count: number): TransportLeg[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: crypto.randomUUID(),
    routeId: null,
    routeName: "",
    date: addDays(startDate, i),
    cost: 0,
  }));
}

export function computeRouteCost(pricing: RoutePricing | null, distanceKm: number | null): number {
  if (!pricing) return 0;
  if (pricing.totalPrice != null) return pricing.totalPrice;
  const distanceCost = pricing.pricePerKm != null && distanceKm != null ? pricing.pricePerKm * distanceKm : 0;
  return distanceCost + (pricing.nightCharge ?? 0) + (pricing.tollTax ?? 0) + (pricing.driverAllowance ?? 0);
}

export function legTotal(leg: TransportLeg): number {
  return leg.cost;
}

export function totalTransportCost(legs: TransportLeg[]): number {
  return legs.reduce((sum, leg) => sum + legTotal(leg), 0);
}
