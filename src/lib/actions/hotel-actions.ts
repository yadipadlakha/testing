"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const hotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  destination: z.string().min(1, "Destination is required"),
  starRating: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(5).optional()),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.union([z.literal(""), z.string().email()]).optional(),
  pricePerNight: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  notes: z.string().optional(),
});

export async function createHotel(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = hotelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.hotel.create({
    data: {
      name: data.name,
      destination: data.destination,
      starRating: data.starRating,
      address: data.address || undefined,
      contactPerson: data.contactPerson || undefined,
      contactPhone: data.contactPhone || undefined,
      contactEmail: data.contactEmail || undefined,
      pricePerNight: data.pricePerNight,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/hotel");
  redirect("/hotel");
}

export async function updateHotel(hotelId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = hotelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      name: data.name,
      destination: data.destination,
      starRating: data.starRating ?? null,
      address: data.address || null,
      contactPerson: data.contactPerson || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      pricePerNight: data.pricePerNight ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/hotel");
  redirect("/hotel");
}

export async function deleteHotel(hotelId: string) {
  await requireAdmin();
  await prisma.hotel.delete({ where: { id: hotelId } });
  revalidatePath("/hotel");
}
