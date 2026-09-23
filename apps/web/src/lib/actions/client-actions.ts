"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { ActionState } from "@/lib/actions/auth-actions";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function createClient(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    source: formData.get("source"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const client = await prisma.client.create({
    data: {
      agencyId: session.user.agencyId,
      ownerId: session.user.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClientStage(formData: FormData) {
  const session = await requireSession();
  const clientId = String(formData.get("clientId"));
  const stage = String(formData.get("stage"));

  await prisma.client.update({
    where: { id: clientId, agencyId: session.user.agencyId },
    data: { stage: stage as never },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
}

const interactionSchema = z.object({
  type: z.string().min(1),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().optional().or(z.literal("")),
});

export async function addInteraction(clientId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const parsed = interactionSchema.safeParse({
    type: formData.get("type"),
    subject: formData.get("subject"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!client) {
    return { error: "Client not found" };
  }

  await prisma.interaction.create({
    data: {
      clientId,
      userId: session.user.id,
      type: parsed.data.type as never,
      subject: parsed.data.subject,
      content: parsed.data.content || null,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return undefined;
}
