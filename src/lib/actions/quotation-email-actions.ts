"use server";

import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/permissions";
import { canAccessEnquiry, formatDate, formatEnquiryNumber } from "@/lib/enquiry";
import { computeQuotationTotals, formatQuotationNumber } from "@/lib/quotation";
import { formatCurrency } from "@/lib/format";
import type { ActionState } from "@/lib/actions/auth-actions";

const sendSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  message: z.string().optional(),
});

export async function sendQuotationEmail(
  quotationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireModuleAccess("ENQUIRY");

  const parsed = sendSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: true,
      enquiry: { include: { client: true, allocatedUsers: { select: { id: true } } } },
    },
  });
  if (!quotation) return { error: "Quotation not found." };
  if (!canAccessEnquiry(quotation.enquiry, session)) {
    return { error: "You don't have access to this quotation." };
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    return {
      error:
        "Email isn't configured yet. Ask an admin to set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.",
    };
  }

  const totals = computeQuotationTotals(quotation.items, quotation.markupPercent, quotation.discount, quotation.taxPercent);
  const paxLine = [
    `${quotation.enquiry.adults} Adult${quotation.enquiry.adults === 1 ? "" : "s"}`,
    quotation.enquiry.children > 0 ? `${quotation.enquiry.children} Child${quotation.enquiry.children === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">${formatQuotationNumber(quotation.quotationNumber)} — ${quotation.title}</h2>
      <p style="color: #666; margin-top: 0;">Enquiry ${formatEnquiryNumber(quotation.enquiry.enquiryNumber)}</p>
      <p>Dear ${quotation.enquiry.client.name},</p>
      ${parsed.data.message ? `<p>${parsed.data.message}</p>` : ""}
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 0; color: #666;">Destination</td><td style="text-align: right;">${quotation.enquiry.travelTo}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Travel date</td><td style="text-align: right;">${formatDate(quotation.enquiry.travelDate)}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Duration</td><td style="text-align: right;">${quotation.enquiry.durationDays} days</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Pax</td><td style="text-align: right;">${paxLine}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; border-top: 1px solid #ddd;">Total</td><td style="text-align: right; padding: 8px 0; font-weight: bold; border-top: 1px solid #ddd;">${formatCurrency(totals.total, quotation.currency)}</td></tr>
      </table>
      <p style="color: #666; font-size: 13px;">Please contact us if you have any questions about this quotation.</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: parsed.data.email,
      subject: `Your quotation ${formatQuotationNumber(quotation.quotationNumber)} — ${quotation.title}`,
      html,
    });
  } catch {
    return { error: "Failed to send the email. Check the SMTP configuration and try again." };
  }

  return { success: `Quotation sent to ${parsed.data.email}.` };
}
