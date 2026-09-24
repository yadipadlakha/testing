import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getModulePermissions } from "@/lib/permissions";
import { buildTemplateFile, type TemplateFormat } from "@/lib/bulk-upload";

const HEADERS = [
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

const SAMPLE_ROWS = [
  [
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
  ],
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (session.user.role !== "ADMIN" && !permissions.has("TRANSPORT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format: TemplateFormat = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const { blob, contentType } = buildTemplateFile(HEADERS, SAMPLE_ROWS, format);

  return new NextResponse(blob, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="vehicle-template.${format}"`,
    },
  });
}
