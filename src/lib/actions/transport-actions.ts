"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const transportSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required"),
  destination: z.string().min(1, "Destination is required"),
  capacity: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  pricePerDay: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function createTransport(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = transportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.transport.create({
    data: {
      vehicleType: data.vehicleType,
      destination: data.destination,
      capacity: data.capacity,
      pricePerDay: data.pricePerDay,
      contactPerson: data.contactPerson || undefined,
      contactPhone: data.contactPhone || undefined,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/transport");
  redirect("/transport");
}

export async function updateTransport(
  transportId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = transportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.transport.update({
    where: { id: transportId },
    data: {
      vehicleType: data.vehicleType,
      destination: data.destination,
      capacity: data.capacity ?? null,
      pricePerDay: data.pricePerDay ?? null,
      contactPerson: data.contactPerson || null,
      contactPhone: data.contactPhone || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/transport");
  redirect("/transport");
}

export async function deleteTransport(transportId: string) {
  await requireAdmin();
  await prisma.transport.delete({ where: { id: transportId } });
  revalidatePath("/transport");
}
