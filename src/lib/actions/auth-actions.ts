"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type ActionState = { error?: string; success?: string } | undefined;

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

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
