import { requireSession } from "@/lib/session";
import { TopNav } from "@/components/top-nav";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        name={session.user.name}
        email={session.user.email}
        role={session.user.role === "ADMIN" ? "Admin" : "Agent"}
      />
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card px-3 py-4 md:block">
          <NavLinks />
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
