import { addDays } from "@/lib/hotel-booking";

export type TransportLeg = {
  id: string;
  routeId: string | null;
  routeName: string;
  date: string;
  mileageKm: number;
  rate: number;
  extraCost: number;
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

export function buildDefaultLegs(startDate: string, count: number): TransportLeg[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: crypto.randomUUID(),
    routeId: null,
    routeName: "",
    date: addDays(startDate, i),
    mileageKm: 0,
    rate: 0,
    extraCost: 0,
  }));
}

export function legTotal(leg: TransportLeg): number {
  return leg.rate + leg.extraCost;
}

export function totalTransportCost(legs: TransportLeg[]): number {
  return legs.reduce((sum, leg) => sum + legTotal(leg), 0);
}
