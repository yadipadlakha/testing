import Link from "next/link";
import { cn } from "@/lib/utils";

export function TransportTabs({ active }: { active: "vehicles" | "routes" }) {
  return (
    <div className="flex gap-2">
      <Link
        href="/transport"
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          active === "vehicles"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Manage Vehicle
      </Link>
      <Link
        href="/transport/routes"
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          active === "routes"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Manage Route
      </Link>
    </div>
  );
}
