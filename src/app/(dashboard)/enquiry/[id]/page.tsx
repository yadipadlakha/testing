import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Phone,
  Mail,
  Building2,
  MapPin,
  CalendarDays,
  Users as UsersIcon,
  Star,
  Coins,
  Plus,
  FileText,
} from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateEnquiryStatus } from "@/lib/actions/enquiry-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatQuotationNumber, computeQuotationTotals } from "@/lib/quotation";
import { formatCurrency } from "@/lib/format";
import {
  ENQUIRY_STATUSES,
  STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  TYPE_LABELS,
  formatEnquiryNumber,
  formatDate,
} from "@/lib/enquiry";

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;

  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      client: true,
      allocatedTo: true,
      createdBy: true,
      quotations: { include: { items: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!enquiry) notFound();
  if (session.user.role !== "ADMIN" && enquiry.allocatedToId !== session.user.id) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{formatEnquiryNumber(enquiry.enquiryNumber)}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[enquiry.status]}>{STATUS_LABELS[enquiry.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Created {formatDate(enquiry.createdAt)} by {enquiry.createdBy.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/enquiry/${enquiry.id}/edit`}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateEnquiryStatus.bind(null, enquiry.id)} className="flex flex-wrap items-center gap-3">
            <Select name="status" defaultValue={enquiry.status} className="max-w-xs">
              {ENQUIRY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Update status
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <UsersIcon className="h-4 w-4 text-muted-foreground" /> {enquiry.client.name}
          </p>
          {enquiry.client.companyName ? (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Building2 className="h-4 w-4 text-muted-foreground" /> {enquiry.client.companyName}
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Phone className="h-4 w-4 text-muted-foreground" /> {enquiry.client.phone}
          </p>
          {enquiry.client.email ? (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" /> {enquiry.client.email}
            </p>
          ) : null}
          {enquiry.client.city || enquiry.client.state ? (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {[enquiry.client.city, enquiry.client.state].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Badge variant="outline">{TYPE_LABELS[enquiry.type]}</Badge>
          </p>
          <p className="flex items-center gap-2 text-sm text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {enquiry.travelTo}
          </p>
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {formatDate(enquiry.travelDate)} · {enquiry.durationDays} day{enquiry.durationDays > 1 ? "s" : ""}
          </p>
          <p className="flex items-center gap-2 text-sm text-foreground">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            {enquiry.adults} Adult{enquiry.adults > 1 ? "s" : ""}
            {enquiry.children > 0 ? `, ${enquiry.children} Child${enquiry.children > 1 ? "ren" : ""}` : ""}
            {enquiry.childrenAges ? ` (ages ${enquiry.childrenAges})` : ""}
          </p>
          {enquiry.hotelCategory ? (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Star className="h-4 w-4 text-muted-foreground" /> {enquiry.hotelCategory} Star hotel
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Coins className="h-4 w-4 text-muted-foreground" /> {enquiry.currency}
          </p>
          <p className="text-sm text-foreground">Allocated to {enquiry.allocatedTo?.name ?? "Unassigned"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Quotations</CardTitle>
          <Button asChild size="sm">
            <Link href={`/enquiry/${enquiry.id}/quotations/new`}>
              <Plus className="h-3.5 w-3.5" /> Generate Quotation
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {enquiry.quotations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No quotations yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {enquiry.quotations.map((quotation) => {
                const totals = computeQuotationTotals(
                  quotation.items,
                  quotation.markupPercent,
                  quotation.discount,
                  quotation.taxPercent,
                );
                return (
                  <Link
                    key={quotation.id}
                    href={`/quotations/${quotation.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50 sm:rounded-md sm:px-2"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {formatQuotationNumber(quotation.quotationNumber)} — {quotation.title}
                        </p>
                        <p className="text-xs text-muted-foreground">Created {formatDate(quotation.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(totals.total, quotation.currency)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {enquiry.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-foreground">{enquiry.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
