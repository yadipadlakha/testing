import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, Phone, Mail, Copy } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteQuotation, duplicateQuotation } from "@/lib/actions/quotation-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/quotation/print-button";
import { DownloadButton } from "@/components/quotation/download-button";
import { SendQuotationForm } from "@/components/quotation/send-quotation-form";
import { QuotationTabs, type QuotationTab } from "@/components/quotation/quotation-tabs";
import { SectionCard } from "@/components/quotation/section-card";
import { DayPlanList } from "@/components/quotation/day-plan-list";
import { Logo } from "@/components/logo";
import { buildDayWiseItinerary } from "@/lib/itinerary";
import { formatQuotationNumber, computeQuotationTotals, computePaxSummary, QUOTATION_CATEGORY_LABELS } from "@/lib/quotation";
import { formatCurrency } from "@/lib/format";
import { formatDate, formatEnquiryNumber, canAccessEnquiry } from "@/lib/enquiry";
import type { HotelBookingDetails } from "@/lib/hotel-booking";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function QuotationViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: QuotationTab =
    tab === "voucher" || tab === "invoice" || tab === "profit" ? tab : "quotation";

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      enquiry: { include: { client: true, allocatedUsers: { select: { id: true } } } },
      createdBy: true,
    },
  });

  if (!quotation) notFound();
  if (!canAccessEnquiry(quotation.enquiry, session)) notFound();

  const totals = computeQuotationTotals(
    quotation.items,
    quotation.markupPercent,
    quotation.discount,
    quotation.taxPercent,
  );
  const paxSummary = computePaxSummary(
    quotation.items,
    { adults: quotation.enquiry.adults, children: quotation.enquiry.children },
    totals.total,
  );
  const infantPax = paxSummary.find((row) => row.label === "Infant")?.pax ?? 0;

  const hotelItems = quotation.items.filter(
    (item): item is typeof item & { details: HotelBookingDetails } =>
      item.category === "HOTEL" && item.details != null,
  );

  const dayPlans = buildDayWiseItinerary(quotation.items, toIsoDate(quotation.enquiry.travelDate), quotation.enquiry.durationDays);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/enquiry/${quotation.enquiryId}`} className="text-sm font-medium text-primary hover:underline">
          ← Back to {formatEnquiryNumber(quotation.enquiry.enquiryNumber)}
        </Link>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <DownloadButton />
          <form action={duplicateQuotation.bind(null, quotation.id)}>
            <Button type="submit" variant="outline">
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </form>
          <SendQuotationForm quotationId={quotation.id} />
          <Button asChild variant="outline">
            <Link href={`/quotations/${quotation.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <form action={deleteQuotation.bind(null, quotation.id)}>
            <Button variant="destructive" type="submit">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <QuotationTabs quotationId={quotation.id} active={activeTab} />

      {activeTab !== "quotation" ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {activeTab === "voucher" ? "Service Voucher" : activeTab === "invoice" ? "Finance Invoice" : "Profit"} —
          coming soon.
        </Card>
      ) : (
        <Card className="flex flex-col gap-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <Logo />
            <div className="text-right">
              <h1 className="text-xl font-semibold text-foreground">{formatQuotationNumber(quotation.quotationNumber)}</h1>
              <p className="text-sm text-muted-foreground">Created {formatDate(quotation.createdAt)}</p>
              {quotation.validUntil ? (
                <p className="text-sm text-muted-foreground">Valid until {formatDate(quotation.validUntil)}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Prepared for</p>
              <p className="mt-1 text-sm font-medium text-foreground">{quotation.enquiry.client.name}</p>
              {quotation.enquiry.client.companyName ? (
                <p className="text-sm text-muted-foreground">{quotation.enquiry.client.companyName}</p>
              ) : null}
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {quotation.enquiry.client.phone}
              </p>
              {quotation.enquiry.client.email ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {quotation.enquiry.client.email}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Trip</p>
              <p className="mt-1 text-sm text-foreground">{quotation.enquiry.travelTo}</p>
              <p className="text-xs text-muted-foreground">{formatDate(quotation.enquiry.travelDate)}</p>
            </div>
          </div>

          {/* 1. Trip Itinerary Details */}
          <SectionCard title="Trip Itinerary Details">
            <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between border-b border-border/60 py-1.5 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">Enquiry ID</span>
                <span className="font-medium text-foreground">{formatEnquiryNumber(quotation.enquiry.enquiryNumber)}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 py-1.5 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">Quotation No</span>
                <span className="font-medium text-foreground">{formatQuotationNumber(quotation.quotationNumber)}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 py-1.5 sm:col-span-2 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">Package Name</span>
                <span className="font-medium text-foreground">{quotation.title}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 py-1.5 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">Travel To</span>
                <span className="font-medium text-foreground">{quotation.enquiry.travelTo}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 py-1.5 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">Travel Date</span>
                <span className="font-medium text-foreground">{formatDate(quotation.enquiry.travelDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">Pax</span>
                <span className="font-medium text-foreground">
                  {quotation.enquiry.adults} Adult{quotation.enquiry.adults === 1 ? "" : "s"}
                  {quotation.enquiry.children > 0
                    ? `, ${quotation.enquiry.children} Child${quotation.enquiry.children === 1 ? "" : "ren"}`
                    : ""}
                  {infantPax > 0 ? `, ${infantPax} Infant${infantPax === 1 ? "" : "s"}` : ""}
                </span>
              </div>
              <div className="flex justify-between py-1.5 sm:justify-start sm:gap-2">
                <span className="text-muted-foreground">No Of Days</span>
                <span className="font-medium text-foreground">{quotation.enquiry.durationDays}</span>
              </div>
            </div>
          </SectionCard>

          {/* 2. Hotels */}
          {hotelItems.length > 0 ? (
            <SectionCard title="Hotels">
              <div className="flex flex-col divide-y divide-border">
                {hotelItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.details.hotelName}</p>
                        <p className="text-xs text-muted-foreground">{item.details.city}</p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(item.quantity * item.unitPrice, quotation.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Room: <span className="text-foreground">{item.details.roomType || "—"}</span>
                      </span>
                      <span>
                        Meal: <span className="text-foreground">{item.details.mealPlan || "—"}</span>
                      </span>
                      <span>
                        Check-In: <span className="text-foreground">{formatDate(item.details.checkIn)}</span>
                      </span>
                      <span>
                        Check-Out: <span className="text-foreground">{formatDate(item.details.checkOut)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {/* Line items + totals */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Unit price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-2 text-muted-foreground">{QUOTATION_CATEGORY_LABELS[item.category]}</td>
                    <td className="py-2 text-foreground">{item.description}</td>
                    <td className="py-2 text-right text-foreground">{item.quantity}</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(item.unitPrice, quotation.currency)}</td>
                    <td className="py-2 text-right font-medium text-foreground">
                      {formatCurrency(item.quantity * item.unitPrice, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-4 flex w-full max-w-xs flex-col gap-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal, quotation.currency)}</span>
              </div>
              {quotation.markupPercent > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Markup ({quotation.markupPercent}%)</span>
                  <span>+{formatCurrency(totals.markup, quotation.currency)}</span>
                </div>
              ) : null}
              {quotation.discount > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-{formatCurrency(totals.afterMarkup - totals.afterDiscount, quotation.currency)}</span>
                </div>
              ) : null}
              {quotation.taxPercent > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({quotation.taxPercent}%)</span>
                  <span>{formatCurrency(totals.tax, quotation.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(totals.total, quotation.currency)}</span>
              </div>
            </div>
          </div>

          {/* 3. Total Package Summary */}
          {paxSummary.length > 0 ? (
            <SectionCard title="Total Package Summary">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Pax</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paxSummary.map((row) => (
                    <tr key={row.label} className="border-b border-border/60">
                      <td className="py-2 text-foreground">{row.label}</td>
                      <td className="py-2 text-right text-foreground">{row.pax}</td>
                      <td className="py-2 text-right text-foreground">{formatCurrency(row.rate, quotation.currency)}</td>
                      <td className="py-2 text-right font-medium text-foreground">
                        {formatCurrency(row.total, quotation.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col gap-1 pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.total, quotation.currency)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-foreground">
                  <span>Final Package Cost</span>
                  <span>{formatCurrency(totals.total, quotation.currency)}</span>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {/* 4. Day wise Itinerary */}
          {dayPlans.length > 0 ? (
            <SectionCard title="Day Wise Itinerary">
              <DayPlanList days={dayPlans} defaultOpen />
            </SectionCard>
          ) : null}

          {/* 5. Travel Policies */}
          {quotation.termsAndConditions ? (
            <SectionCard title="Travel Policies">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quotation.termsAndConditions}</p>
            </SectionCard>
          ) : null}
        </Card>
      )}
    </div>
  );
}
