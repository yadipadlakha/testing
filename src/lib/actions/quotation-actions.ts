"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/permissions";
import { canAccessEnquiry } from "@/lib/enquiry";
import type { ActionState } from "@/lib/actions/auth-actions";
import type { Prisma } from "@prisma/client";

const itemSchema = z.object({
  category: z.enum(["HOTEL", "SIGHTSEEING", "TRANSPORT", "EXPENSE", "GUIDE", "OTHER"]),
  description: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
  details: z.unknown().optional(),
});

const quotationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  currency: z.string().min(1, "Currency is required"),
  validUntil: z.string().optional(),
  markupPercent: z.coerce.number().int().min(0).max(1000).default(0),
  discount: z.coerce.number().int().min(0).default(0),
  taxPercent: z.coerce.number().int().min(0).max(100).default(0),
  termsAndConditions: z.string().optional(),
  itemsJson: z.string(),
});

function parseItems(itemsJson: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(itemsJson);
  } catch {
    return null;
  }
  const parsed = z.array(itemSchema).safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function createQuotation(
  enquiryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireModuleAccess("ENQUIRY");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { allocatedUsers: { select: { id: true } } },
  });
  if (!enquiry) return { error: "Enquiry not found." };
  if (!canAccessEnquiry(enquiry, session)) {
    return { error: "You don't have access to this enquiry." };
  }

  const parsed = quotationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const items = parseItems(parsed.data.itemsJson);
  if (!items || items.length === 0) return { error: "Add at least one item to the quotation." };

  const quotation = await prisma.quotation.create({
    data: {
      enquiryId,
      title: parsed.data.title,
      currency: parsed.data.currency,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
      markupPercent: parsed.data.markupPercent,
      discount: parsed.data.discount,
      taxPercent: parsed.data.taxPercent,
      termsAndConditions: parsed.data.termsAndConditions || undefined,
      createdById: session.user.id,
      items: {
        create: items.map((item, index) => ({
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: index,
          details: item.details as Prisma.InputJsonValue | undefined,
        })),
      },
    },
  });

  revalidatePath(`/enquiry/${enquiryId}`);
  redirect(`/quotations/${quotation.id}`);
}

export async function updateQuotation(
  quotationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireModuleAccess("ENQUIRY");

  const existing = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { enquiry: { include: { allocatedUsers: { select: { id: true } } } } },
  });
  if (!existing) return { error: "Quotation not found." };
  if (!canAccessEnquiry(existing.enquiry, session)) {
    return { error: "You don't have access to this quotation." };
  }

  const parsed = quotationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const items = parseItems(parsed.data.itemsJson);
  if (!items || items.length === 0) return { error: "Add at least one item to the quotation." };

  await prisma.$transaction([
    prisma.quotationItem.deleteMany({ where: { quotationId } }),
    prisma.quotation.update({
      where: { id: quotationId },
      data: {
        title: parsed.data.title,
        currency: parsed.data.currency,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        markupPercent: parsed.data.markupPercent,
        discount: parsed.data.discount,
        taxPercent: parsed.data.taxPercent,
        termsAndConditions: parsed.data.termsAndConditions || null,
        items: {
          create: items.map((item, index) => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: index,
            details: item.details as Prisma.InputJsonValue | undefined,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/quotations/${quotationId}`);
  redirect(`/quotations/${quotationId}`);
}

export async function deleteQuotation(quotationId: string) {
  const session = await requireModuleAccess("ENQUIRY");

  const existing = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { enquiry: { include: { allocatedUsers: { select: { id: true } } } } },
  });
  if (!existing) return;
  if (!canAccessEnquiry(existing.enquiry, session)) return;

  await prisma.quotation.delete({ where: { id: quotationId } });
  revalidatePath(`/enquiry/${existing.enquiryId}`);
  redirect(`/enquiry/${existing.enquiryId}`);
}
