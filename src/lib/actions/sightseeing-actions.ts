"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const sightseeingSchema = z.object({
  name: z.string().min(1, "Activity name is required"),
  destination: z.string().min(1, "Destination is required"),
  duration: z.string().optional(),
  price: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  description: z.string().optional(),
});

export async function createSightseeing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = sightseeingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.sightseeing.create({
    data: {
      name: data.name,
      destination: data.destination,
      duration: data.duration || undefined,
      price: data.price,
      description: data.description || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/sightseeing");
  redirect("/sightseeing");
}

export async function updateSightseeing(
  sightseeingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = sightseeingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.sightseeing.update({
    where: { id: sightseeingId },
    data: {
      name: data.name,
      destination: data.destination,
      duration: data.duration || null,
      price: data.price ?? null,
      description: data.description || null,
    },
  });

  revalidatePath("/sightseeing");
  redirect("/sightseeing");
}

export async function deleteSightseeing(sightseeingId: string) {
  await requireAdmin();
  await prisma.sightseeing.delete({ where: { id: sightseeingId } });
  revalidatePath("/sightseeing");
}
