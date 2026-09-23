"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

const enquirySchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientPhone: z.string().min(6, "A valid phone number is required"),
  clientEmail: z.union([z.literal(""), z.string().email()]).optional(),
  companyName: z.string().optional(),
  type: z.enum(["HOLIDAY_PACKAGE", "FLIGHT_ONLY", "HOTEL_ONLY", "VISA", "OTHER"]),
  travelFrom: z.string().optional(),
  travelTo: z.string().min(1, "Destination is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day"),
  adults: z.coerce.number().int().min(1, "At least 1 adult is required"),
  children: z.coerce.number().int().min(0).default(0),
  followDate: z.string().optional(),
  notes: z.string().optional(),
  allocatedToId: z.string().optional(),
});

async function upsertClient(data: { name: string; phone: string; email?: string; companyName?: string }) {
  return prisma.client.upsert({
    where: { phone: data.phone },
    update: {
      name: data.name,
      email: data.email || undefined,
      companyName: data.companyName || undefined,
    },
    create: {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      companyName: data.companyName || undefined,
    },
  });
}

export async function createEnquiry(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireModuleAccess("ENQUIRY");

  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const client = await upsertClient({
    name: data.clientName,
    phone: data.clientPhone,
    email: data.clientEmail,
    companyName: data.companyName,
  });

  const allocatedToId = session.user.role === "ADMIN" ? data.allocatedToId || session.user.id : session.user.id;

  const enquiry = await prisma.enquiry.create({
    data: {
      clientId: client.id,
      type: data.type,
      travelFrom: data.travelFrom || undefined,
      travelTo: data.travelTo,
      travelDate: new Date(data.travelDate),
      durationDays: data.durationDays,
      adults: data.adults,
      children: data.children,
      followDate: data.followDate ? new Date(data.followDate) : undefined,
      notes: data.notes || undefined,
      allocatedToId,
      createdById: session.user.id,
    },
  });

  revalidatePath("/enquiry");
  redirect(`/enquiry/${enquiry.id}`);
}

export async function updateEnquiry(
  enquiryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireModuleAccess("ENQUIRY");

  const existing = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!existing) return { error: "Enquiry not found." };
  if (session.user.role !== "ADMIN" && existing.allocatedToId !== session.user.id) {
    return { error: "You don't have access to this enquiry." };
  }

  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const client = await upsertClient({
    name: data.clientName,
    phone: data.clientPhone,
    email: data.clientEmail,
    companyName: data.companyName,
  });

  const allocatedToId =
    session.user.role === "ADMIN" ? data.allocatedToId || existing.allocatedToId : existing.allocatedToId;

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      clientId: client.id,
      type: data.type,
      travelFrom: data.travelFrom || undefined,
      travelTo: data.travelTo,
      travelDate: new Date(data.travelDate),
      durationDays: data.durationDays,
      adults: data.adults,
      children: data.children,
      followDate: data.followDate ? new Date(data.followDate) : null,
      notes: data.notes || undefined,
      allocatedToId,
    },
  });

  revalidatePath("/enquiry");
  revalidatePath(`/enquiry/${enquiryId}`);
  redirect(`/enquiry/${enquiryId}`);
}

const statusSchema = z.object({
  status: z.enum(["NEW_QUERY", "QUOTATION_SENT", "ON_HOLD", "CONVERTED", "FOLLOW_UP", "LOST"]),
});

export async function updateEnquiryStatus(enquiryId: string, formData: FormData) {
  const session = await requireModuleAccess("ENQUIRY");

  const existing = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!existing) return;
  if (session.user.role !== "ADMIN" && existing.allocatedToId !== session.user.id) {
    return;
  }

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: parsed.data.status } });
  revalidatePath("/enquiry");
  revalidatePath(`/enquiry/${enquiryId}`);
}

export async function deleteEnquiry(enquiryId: string) {
  const session = await requireModuleAccess("ENQUIRY");

  const existing = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!existing) return;
  if (session.user.role !== "ADMIN" && existing.allocatedToId !== session.user.id) {
    return;
  }

  await prisma.enquiry.delete({ where: { id: enquiryId } });
  revalidatePath("/enquiry");
}
