import { requireSession } from "@/lib/session";
import { getModulePermissions } from "@/lib/permissions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const permissions = await getModulePermissions(session.user.id, session.user.role);
  const permittedModules = Array.from(permissions);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={session.user.role} permittedModules={permittedModules} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={session.user.name}
          email={session.user.email}
          role={session.user.role}
          permittedModules={permittedModules}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
