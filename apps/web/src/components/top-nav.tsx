import { LogOut, Map } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth-actions";
import { initials } from "@/lib/utils";

export function TopNav({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between bg-primary px-5 text-primary-foreground">
      <div className="flex items-center gap-2">
        <Map className="h-5 w-5" />
        <span className="text-base font-semibold tracking-tight">Voyager</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              {initials(name || email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem asChild>
              <button type="submit" className="flex w-full items-center gap-2 text-destructive">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
