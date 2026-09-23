import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Requires an authenticated session; redirects to /login otherwise. Use in server components/pages. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/** Requires an authenticated ADMIN session; redirects to /dashboard otherwise. */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}
