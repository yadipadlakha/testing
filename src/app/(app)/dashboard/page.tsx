import { requireSession } from "@/lib/session";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome, {session.user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re signed in as {session.user.email}. The admin dashboard is coming up next.
        </p>
      </div>
      <form action={signOutAction}>
        <Button variant="outline" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
