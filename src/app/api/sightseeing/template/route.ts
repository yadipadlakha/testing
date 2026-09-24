import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getModulePermissions } from "@/lib/permissions";
import { buildTemplateWorkbook } from "@/lib/bulk-upload";

const ACTIVITY_HEADERS = [
  "ID",
  "Name",
  "Country",
  "City",
  "Star Rating",
  "Duration",
  "Address",
  "Latitude",
  "Longitude",
  "Contact Phone",
  "Tour Summary",
  "Price",
  "Activity Types",
];
const ACTIVITY_SAMPLE = [
  "",
  "Sigiriya Rock Fortress Tour",
  "Sri Lanka",
  "Dambulla",
  "4.5",
  "Full Day",
  "Sigiriya, Central Province",
  "7.9570",
  "80.7603",
  "+94 81 249 8000",
  "Guided full-day tour of the ancient Sigiriya rock fortress, a UNESCO World Heritage Site.",
  "3500",
  "Cultural Tour, Early Entry Pass",
];

const RATE_HEADERS = [
  "Activity ID (optional)",
  "Activity Name",
  "Title",
  "Start Date",
  "End Date",
  "Days Of Week",
  "Adult Rate",
  "Min Adult",
  "Max Adult",
  "Child Rate",
  "Min Child",
  "Max Child",
  "Infant Rate",
  "Min Infant",
  "Max Infant",
  "Cancel Policy",
];
const RATE_SAMPLE = [
  "",
  "Sigiriya Rock Fortress Tour",
  "Standard season",
  "2026-01-01",
  "2026-12-31",
  "Sun, Mon, Tue, Wed, Thu, Fri, Sat",
  "3500",
  "1",
  "",
  "1800",
  "0",
  "4",
  "0",
  "",
  "",
  "Free cancellation up to 24 hours before the activity.",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (session.user.role !== "ADMIN" && !permissions.has("SIGHTSEEING")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blob = buildTemplateWorkbook([
    { name: "Activities", headers: ACTIVITY_HEADERS, rows: [ACTIVITY_SAMPLE] },
    { name: "Price Calendar", headers: RATE_HEADERS, rows: [RATE_SAMPLE] },
  ]);

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="activity-template.xlsx"',
    },
  });
}
