import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Eye, Phone, Mail, MapPin, Users as UsersIcon } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteEnquiry } from "@/lib/actions/enquiry-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ENQUIRY_STATUSES,
  STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  TYPE_LABELS,
  formatEnquiryNumber,
  formatDate,
  enquiryScopeWhere,
} from "@/lib/enquiry";
import type { EnquiryStatus, Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default async function EnquiryListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const session = await requireModuleAccess("ENQUIRY");
  const params = await searchParams;

  const tab = (ENQUIRY_STATUSES.includes(params.tab as EnquiryStatus) ? params.tab : "NEW_QUERY") as EnquiryStatus;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const scope = enquiryScopeWhere(session);
  const searchFilter: Prisma.EnquiryWhereInput = query
    ? {
        OR: [
          { client: { name: { contains: query, mode: "insensitive" } } },
          { client: { phone: { contains: query, mode: "insensitive" } } },
          { client: { email: { contains: query, mode: "insensitive" } } },
          { travelTo: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [counts, enquiries, totalForTab] = await Promise.all([
    prisma.enquiry.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.enquiry.findMany({
      where: { ...scope, status: tab, ...searchFilter },
      include: { client: true, allocatedUsers: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.enquiry.count({ where: { ...scope, status: tab, ...searchFilter } }),
  ]);
  const countByStatus = Object.fromEntries(counts.map((row) => [row.status, row._count._all])) as Record<
    EnquiryStatus,
    number
  >;

  const totalPages = Math.max(1, Math.ceil(totalForTab / PAGE_SIZE));

  function tabHref(status: EnquiryStatus) {
    const search = new URLSearchParams();
    search.set("tab", status);
    if (query) search.set("q", query);
    return `/enquiry?${search.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Enquiries</h1>
        <Button asChild>
          <Link href="/enquiry/new">
            <Plus className="h-4 w-4" /> Add New Enquiry
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ENQUIRY_STATUSES.map((status) => (
          <Link
            key={status}
            href={tabHref(status)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              tab === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {STATUS_LABELS[status]}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                tab === status ? "bg-white/20" : "bg-muted text-muted-foreground",
              )}
            >
              {countByStatus[status] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <form className="flex gap-2" action="/enquiry" method="get">
        <input type="hidden" name="tab" value={tab} />
        <Input name="q" defaultValue={query} placeholder="Search by name, phone, email, or destination…" className="max-w-md" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {enquiries.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No enquiries in {STATUS_LABELS[tab]}{query ? ` matching “${query}”` : ""}.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id} className="gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_BADGE_VARIANT[enquiry.status]}>{STATUS_LABELS[enquiry.status]}</Badge>
                  <Badge variant="outline">{TYPE_LABELS[enquiry.type]}</Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {formatEnquiryNumber(enquiry.enquiryNumber)}
                  </span>
                  <span className="text-xs text-muted-foreground">Created {formatDate(enquiry.createdAt)}</span>
                </div>
                <div className="flex gap-1.5">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/enquiry/${enquiry.id}`}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/enquiry/${enquiry.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <form action={deleteEnquiry.bind(null, enquiry.id)}>
                    <Button variant="destructive" size="sm" type="submit">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-medium text-foreground">
                    {enquiry.client.companyName ? `${enquiry.client.companyName} — ` : ""}
                    {enquiry.client.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {enquiry.client.phone}
                  </p>
                  {enquiry.client.email ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {enquiry.client.email}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {enquiry.travelTo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(enquiry.travelDate)} · {enquiry.durationDays} day{enquiry.durationDays > 1 ? "s" : ""}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-foreground">
                    <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {enquiry.adults} Adult{enquiry.adults > 1 ? "s" : ""}
                    {enquiry.children > 0 ? `, ${enquiry.children} Child${enquiry.children > 1 ? "ren" : ""}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enquiry.currency}
                    {enquiry.hotelCategory ? ` · ${enquiry.hotelCategory} Star hotel` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-foreground">Allocated to</p>
                  <p className="text-xs text-muted-foreground">
                    {enquiry.allocatedUsers.length > 0
                      ? enquiry.allocatedUsers.map((u) => u.name).join(", ")
                      : "Unassigned"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const search = new URLSearchParams();
            search.set("tab", tab);
            if (query) search.set("q", query);
            search.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/enquiry?${search.toString()}`}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium",
                  p === page ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                {p}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
