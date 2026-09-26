"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ALL_MODULES } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";
import type { Module } from "@prisma/client";

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function parseModules(formData: FormData): Module[] {
  return ALL_MODULES.filter((module) => formData.getAll("modules").includes(module));
}

export async function createEmployee(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const modules = parseModules(formData);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const employee = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: "EMPLOYEE",
      createdById: admin.user.id,
      permissions: { create: modules.map((module) => ({ module })) },
    },
  });

  revalidatePath("/employees");
  redirect(`/employees/${employee.id}`);
}

const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changeEmployeePassword(
  employeeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.role !== "EMPLOYEE") {
    return { error: "Employee not found." };
  }

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: employeeId }, data: { passwordHash } });

  return { success: "Password updated." };
}

export async function updateEmployeePermissions(employeeId: string, formData: FormData) {
  await requireAdmin();

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.role !== "EMPLOYEE") return;

  const modules = parseModules(formData);

  await prisma.$transaction([
    prisma.employeePermission.deleteMany({ where: { userId: employeeId } }),
    prisma.employeePermission.createMany({ data: modules.map((module) => ({ userId: employeeId, module })) }),
  ]);

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
}
