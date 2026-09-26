"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

const salesPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactNumber: z.string().min(6, "A valid contact number is required"),
  email: z.union([z.literal(""), z.string().email()]).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export async function createSalesPerson(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireModuleAccess("ENQUIRY");

  const parsed = salesPersonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  await prisma.salesPerson.create({
    data: {
      name: data.name,
      contactNumber: data.contactNumber,
      email: data.email || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      country: data.country || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/sales-persons");
  redirect("/sales-persons");
}

export async function updateSalesPerson(
  salesPersonId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireModuleAccess("ENQUIRY");

  const parsed = salesPersonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  await prisma.salesPerson.update({
    where: { id: salesPersonId },
    data: {
      name: data.name,
      contactNumber: data.contactNumber,
      email: data.email || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
    },
  });

  revalidatePath("/sales-persons");
  redirect("/sales-persons");
}

export async function deleteSalesPerson(salesPersonId: string) {
  await requireModuleAccess("ENQUIRY");
  await prisma.salesPerson.delete({ where: { id: salesPersonId } });
  revalidatePath("/sales-persons");
}
