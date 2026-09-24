import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getModulePermissions } from "@/lib/permissions";
import { buildTemplateFile, type TemplateFormat } from "@/lib/bulk-upload";

const HEADERS = [
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

const SAMPLE_ROWS = [
  [
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
  ],
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (session.user.role !== "ADMIN" && !permissions.has("SIGHTSEEING")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format: TemplateFormat = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const { blob, contentType } = buildTemplateFile(HEADERS, SAMPLE_ROWS, format);

  return new NextResponse(blob, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="activity-template.${format}"`,
    },
  });
}
