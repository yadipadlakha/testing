"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ActionState = { error?: string } | undefined;

export async function authenticate(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

const registerSchema = z.object({
  agencyName: z.string().min(2, "Agency name is required"),
  name: z.string().min(2, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerAgency(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    agencyName: formData.get("agencyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { agencyName, name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.agency.create({
    data: {
      name: agencyName,
      users: {
        create: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
        },
      },
    },
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }

  return undefined;
}
