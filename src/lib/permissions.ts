import { redirect } from "next/navigation";
import type { Module } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const ALL_MODULES: Module[] = ["ENQUIRY", "HOTEL", "SIGHTSEEING", "TRANSPORT"];

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}

export async function getModulePermissions(userId: string, role: "ADMIN" | "EMPLOYEE") {
  if (role === "ADMIN") return new Set<Module>(ALL_MODULES);
  const rows = await prisma.employeePermission.findMany({ where: { userId } });
  return new Set(rows.map((row) => row.module));
}

export async function requireModuleAccess(module: Module) {
  const session = await requireSession();
  if (session.user.role === "ADMIN") return session;

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (!permissions.has(module)) {
    redirect("/dashboard");
  }
  return session;
}
