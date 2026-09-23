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
