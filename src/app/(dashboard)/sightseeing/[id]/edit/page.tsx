import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SightseeingForm } from "@/components/sightseeing/sightseeing-form";
import { SightseeingRateManager } from "@/components/sightseeing/sightseeing-rate-manager";
import { PriceCalendar } from "@/components/sightseeing/price-calendar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditSightseeingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { month: monthParam } = await searchParams;

  const [activity, allActivityTypes] = await Promise.all([
    prisma.sightseeing.findUnique({
      where: { id },
      include: { activityTypes: true, rates: { orderBy: { startDate: "asc" } } },
    }),
    prisma.sightseeingActivityType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!activity) notFound();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = (monthParam ?? defaultMonth).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update activity details and manage its price calendar.</p>
      </div>

      <SightseeingForm
        mode="edit"
        sightseeingId={activity.id}
        allActivityTypes={allActivityTypes}
        selectedActivityTypeIds={activity.activityTypes.map((type) => type.id)}
        defaultValues={{
          name: activity.name,
          country: activity.country,
          city: activity.city,
          starRating: activity.starRating ?? "",
          duration: activity.duration ?? "",
          address: activity.address ?? "",
          latitude: activity.latitude ?? "",
          longitude: activity.longitude ?? "",
          contactPhone: activity.contactPhone ?? "",
          tourSummary: activity.tourSummary ?? "",
          price: activity.price ?? "",
        }}
      />

      <SightseeingRateManager sightseeingId={activity.id} rates={activity.rates} />

      <Card>
        <CardHeader>
          <CardTitle>Price calendar</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <PriceCalendar sightseeingId={activity.id} rates={activity.rates} year={year} month={month} />
        </div>
      </Card>
    </div>
  );
}
