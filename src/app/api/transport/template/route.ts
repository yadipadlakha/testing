import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getModulePermissions } from "@/lib/permissions";
import { buildTemplateWorkbook } from "@/lib/bulk-upload";

const VEHICLE_HEADERS = [
  "ID",
  "Vehicle Type",
  "Sub Type",
  "AC/NONAC",
  "Seats",
  "Vehicle Number",
  "Trip Types",
  "Title",
  "Location",
  "Packages Starting",
  "Price Per KM",
  "Price Per Hour",
  "Recommended Driver",
  "Amenities",
];
const VEHICLE_SAMPLE = [
  "",
  "Sedan",
  "Toyota Camry",
  "AC",
  "4",
  "WP-CAB-2451",
  "Outstation, Airport",
  "AC Sedan — Sigiriya Transfers",
  "Colombo, Sri Lanka",
  "Half Day / Full Day / Outstation",
  "65",
  "450",
  "Sunil Perera",
  "Wifi, Charging Point, Water Bottle",
];

const ROUTE_HEADERS = [
  "ID",
  "Route Name",
  "Destinations",
  "Itinerary Text",
  "Actual Distance Km",
  "Display Distance Km",
  "Itinerary Duration Hours",
  "Attractions/Activities",
];
const ROUTE_SAMPLE = [
  "",
  "Colombo to Sigiriya",
  "Colombo, Dambulla, Sigiriya",
  "Depart Colombo early morning, drive via Dambulla, arrive Sigiriya for the rock fortress tour, return evening.",
  "170",
  "170",
  "10",
  "Sigiriya Rock Fortress Tour",
];

const PRICING_HEADERS = [
  "Vehicle ID (optional)",
  "Vehicle Title",
  "Route ID (optional)",
  "Route Name",
  "Price/KM",
  "Night Charge",
  "Toll Tax",
  "Driver Allowance",
  "Total Price",
];
const PRICING_SAMPLE = ["", "AC Sedan — Sigiriya Transfers", "", "Colombo to Sigiriya", "65", "500", "300", "1000", "12850"];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (session.user.role !== "ADMIN" && !permissions.has("TRANSPORT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blob = buildTemplateWorkbook([
    { name: "Vehicles", headers: VEHICLE_HEADERS, rows: [VEHICLE_SAMPLE] },
    { name: "Routes", headers: ROUTE_HEADERS, rows: [ROUTE_SAMPLE] },
    { name: "Route Pricing", headers: PRICING_HEADERS, rows: [PRICING_SAMPLE] },
  ]);

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="transport-template.xlsx"',
    },
  });
}
