export const VEHICLE_TYPES: string[] = [
  "Hatchback",
  "Sedan",
  "SUV / MUV",
  "Tempo Traveller",
  "Mini Bus",
  "Coach / Bus",
  "Luxury Car",
];

export const AC_TYPES: { value: string; label: string }[] = [
  { value: "AC", label: "AC" },
  { value: "NONAC", label: "NONAC" },
];

export const TRIP_TYPES: { value: string; label: string }[] = [
  { value: "OUTSTATION", label: "Outstation" },
  { value: "LOCAL", label: "Local" },
  { value: "AIRPORT", label: "Airport" },
];

export const VEHICLE_AMENITIES: string[] = [
  "Wifi",
  "Music",
  "Movie",
  "Bus Tracking",
  "Charging Point",
  "Emergency Contact",
  "Overhead Storage",
  "Back Compartment",
  "Reading Light",
  "Blanket",
  "Water Bottle",
  "Bed Sheet",
  "Toilet",
];

export function tripTypeLabel(value: string) {
  return TRIP_TYPES.find((t) => t.value === value)?.label ?? value;
}

export type TransportCatalogEntry = { id: string; label: string; unitPrice: number; quantity: number };

export function buildTransportCatalog(
  vehicles: {
    id: string;
    title: string;
    pricePerHour: number | null;
    pricePerKm: number | null;
    routePricing: { id: string; totalPrice: number | null; route: { name: string } }[];
  }[],
  durationDays: number,
): TransportCatalogEntry[] {
  const entries: TransportCatalogEntry[] = [];
  for (const vehicle of vehicles) {
    if (vehicle.routePricing.length > 0) {
      for (const pricing of vehicle.routePricing) {
        entries.push({
          id: pricing.id,
          label: `${vehicle.title} — ${pricing.route.name}`,
          unitPrice: pricing.totalPrice ?? 0,
          quantity: 1,
        });
      }
    } else {
      entries.push({
        id: vehicle.id,
        label: `${vehicle.title} (est. per day)`,
        unitPrice: vehicle.pricePerHour ?? vehicle.pricePerKm ?? 0,
        quantity: durationDays,
      });
    }
  }
  return entries;
}
