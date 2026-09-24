import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, Phone, Mail } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteQuotation } from "@/lib/actions/quotation-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/quotation/print-button";
import { Logo } from "@/components/logo";
import { formatQuotationNumber, computeQuotationTotals, QUOTATION_CATEGORY_LABELS } from "@/lib/quotation";
import { formatCurrency } from "@/lib/format";
import { formatDate, formatEnquiryNumber } from "@/lib/enquiry";

export default async function QuotationViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      enquiry: { include: { client: true } },
      createdBy: true,
    },
  });

  if (!quotation) notFound();
  if (session.user.role !== "ADMIN" && quotation.enquiry.allocatedToId !== session.user.id) notFound();

  const totals = computeQuotationTotals(quotation.items, quotation.discount, quotation.taxPercent);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/enquiry/${quotation.enquiryId}`} className="text-sm font-medium text-primary hover:underline">
          ← Back to {formatEnquiryNumber(quotation.enquiry.enquiryNumber)}
        </Link>
        <div className="flex gap-2">
          <PrintButton />
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

      <Card className="p-8">
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

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-6">
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

        <div className="py-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">{quotation.title}</h2>
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
            {quotation.discount > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(totals.subtotal - totals.afterDiscount, quotation.currency)}</span>
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

        {quotation.termsAndConditions ? (
          <div className="border-t border-border pt-6">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Terms &amp; conditions</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quotation.termsAndConditions}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
