"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/permissions";
import { canAccessEnquiry } from "@/lib/enquiry";
import type { ActionState } from "@/lib/actions/auth-actions";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const enquirySchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientPhone: z.string().min(6, "A valid phone number is required"),
  clientEmail: z.union([z.literal(""), z.string().email()]).optional(),
  companyName: z.string().optional(),
  clientCity: z.string().optional(),
  clientState: z.string().optional(),
  type: z.enum(["HOLIDAY_PACKAGE", "FLIGHT_ONLY", "HOTEL_ONLY", "VISA", "OTHER"]),
  travelTo: z.string().min(1, "Destination is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day"),
  adults: z.coerce.number().int().min(1, "At least 1 adult is required"),
  children: z.coerce.number().int().min(0).default(0),
  childrenAges: z.string().optional(),
  hotelCategory: z.preprocess(emptyToUndefined, z.coerce.number().int().min(3).max(5).optional()),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  salesPersonId: z.string().optional(),
});

async function upsertClient(data: {
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  city?: string;
  state?: string;
}) {
  return prisma.client.upsert({
    where: { phone: data.phone },
    update: {
      name: data.name,
      email: data.email || undefined,
      companyName: data.companyName || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
    },
    create: {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      companyName: data.companyName || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
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
    city: data.clientCity,
    state: data.clientState,
  });

  const allocatedUserIds =
    session.user.role === "ADMIN" ? formData.getAll("allocatedUserIds").map(String) : [session.user.id];

  const enquiry = await prisma.enquiry.create({
    data: {
      clientId: client.id,
      type: data.type,
      travelTo: data.travelTo,
      travelDate: new Date(data.travelDate),
      durationDays: data.durationDays,
      adults: data.adults,
      children: data.children,
      childrenAges: data.childrenAges || undefined,
      hotelCategory: data.hotelCategory,
      currency: data.currency,
      notes: data.notes || undefined,
      salesPersonId: data.salesPersonId || undefined,
      allocatedUsers: { connect: allocatedUserIds.map((id) => ({ id })) },
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

  const existing = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { allocatedUsers: { select: { id: true } } },
  });
  if (!existing) return { error: "Enquiry not found." };
  if (!canAccessEnquiry(existing, session)) {
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
    city: data.clientCity,
    state: data.clientState,
  });

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      clientId: client.id,
      type: data.type,
      travelTo: data.travelTo,
      travelDate: new Date(data.travelDate),
      durationDays: data.durationDays,
      adults: data.adults,
      children: data.children,
      childrenAges: data.childrenAges || null,
      hotelCategory: data.hotelCategory ?? null,
      currency: data.currency,
      notes: data.notes || undefined,
      salesPersonId: data.salesPersonId || null,
      ...(session.user.role === "ADMIN"
        ? { allocatedUsers: { set: formData.getAll("allocatedUserIds").map((id) => ({ id: String(id) })) } }
        : {}),
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

  const existing = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { allocatedUsers: { select: { id: true } } },
  });
  if (!existing) return;
  if (!canAccessEnquiry(existing, session)) return;

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: parsed.data.status } });
  revalidatePath("/enquiry");
  revalidatePath(`/enquiry/${enquiryId}`);
}

export async function deleteEnquiry(enquiryId: string) {
  const session = await requireModuleAccess("ENQUIRY");

  const existing = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { allocatedUsers: { select: { id: true } } },
  });
  if (!existing) return;
  if (!canAccessEnquiry(existing, session)) return;

  await prisma.enquiry.delete({ where: { id: enquiryId } });
  revalidatePath("/enquiry");
}
