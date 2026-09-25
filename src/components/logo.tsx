import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  variant = "default",
  className,
}: {
  variant?: "default" | "light";
  className?: string;
}) {
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm shadow-primary/30 transition-transform duration-200 hover:scale-105 hover:rotate-3",
          isLight ? "bg-white/15" : "bg-gradient-to-br from-primary via-primary to-accent",
        )}
      >
        <Plane className={cn("h-5 w-5 -rotate-45", isLight ? "text-white" : "text-white")} />
      </span>
      <span className="text-xl font-bold tracking-tight whitespace-nowrap">
        <span className={isLight ? "text-white" : "text-foreground"}>Travel</span>
        <span className={isLight ? "text-orange-300" : "text-accent"}>Everywhere</span>
      </span>
    </div>
  );
}
