import { requireSession } from "@/lib/session";
import { signOutAction } from "@/lib/actions/auth-actions";
import { NavLinks } from "@/components/nav-links";
import { initials } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center px-5">
          <span className="text-lg font-bold tracking-tight text-slate-900">Voyager</span>
        </div>
        <div className="flex-1 px-3">
          <NavLinks />
        </div>
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {initials(session.user.name ?? session.user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{session.user.name}</p>
              <p className="truncate text-xs text-slate-500">{session.user.role === "ADMIN" ? "Admin" : "Agent"}</p>
            </div>
          </div>
          <form action={signOutAction} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
