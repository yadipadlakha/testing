import Link from "next/link";
import { Plus, Upload, Pencil, Trash2, Search } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteSightseeing } from "@/lib/actions/sightseeing-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/pagination";
import { formatCurrency } from "@/lib/format";
import { PAGE_SIZE, buildQuery } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export default async function SightseeingListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; city?: string; activityTypeId?: string; page?: string }>;
}) {
  const session = await requireModuleAccess("SIGHTSEEING");
  const isAdmin = session.user.role === "ADMIN";
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const activityTypeId = params.activityTypeId?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.SightseeingWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
    ...(activityTypeId ? { activityTypes: { some: { id: activityTypeId } } } : {}),
  };

  const [activities, totalCount, countries, cities, activityTypes] = await Promise.all([
    prisma.sightseeing.findMany({
      where,
      include: { activityTypes: true, _count: { select: { rates: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sightseeing.count({ where }),
    prisma.sightseeing.findMany({ distinct: ["country"], select: { country: true }, orderBy: { country: "asc" } }),
    prisma.sightseeing.findMany({ distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
    prisma.sightseeingActivityType.findMany({ orderBy: { name: "asc" } }),
  ]);

  const filterParams = { q, country, city, activityTypeId };
  const hasFilters = Boolean(q || country || city || activityTypeId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sightseeing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog of activities and excursions by destination.</p>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/sightseeing/bulk-upload">
                <Upload className="h-4 w-4" /> Bulk Upload
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sightseeing/new">
                <Plus className="h-4 w-4" /> Add Activity
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <form action="/sightseeing" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Activity name…" className="w-48" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Select id="country" name="country" defaultValue={country} className="w-40">
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Select id="city" name="city" defaultValue={city} className="w-40">
            <option value="">All Cities</option>
            {cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activityTypeId">Activity Type</Label>
          <Select id="activityTypeId" name="activityTypeId" defaultValue={activityTypeId} className="w-40">
            <option value="">All Types</option>
            {activityTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> Apply
        </Button>
        {hasFilters ? (
          <Button asChild variant="outline">
            <Link href="/sightseeing">Clear</Link>
          </Button>
        ) : null}
      </form>

      {activities.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No activities found{hasFilters ? " for these filters" : ""}.
        </Card>
      ) : (
        <Card className="gap-0 overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Types</th>
                <th className="px-4 py-3">Rate bands</th>
                {isAdmin ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{activity.name}</p>
                    {activity.starRating ? (
                      <p className="text-xs text-amber-600">{activity.starRating} ★</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {activity.city}, {activity.country}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{activity.duration ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">
                    {activity.price ? `${formatCurrency(activity.price)} / person` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {activity.activityTypes.map((type) => (
                        <Badge key={type.id} variant="outline">
                          {type.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{activity._count.rates}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/sightseeing/${activity.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <form action={deleteSightseeing.bind(null, activity.id)}>
                          <Button variant="destructive" size="sm" type="submit">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        buildHref={(p) => `/sightseeing${buildQuery(filterParams, p)}`}
      />
    </div>
  );
}
