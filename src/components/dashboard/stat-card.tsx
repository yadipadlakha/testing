import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "amber" | "rose" | "teal" | "blue" | "purple" | "cyan";
}) {
  const accentClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    teal: "bg-teal-100 text-teal-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };

  return (
    <Card className="flex-row items-center gap-4 p-4">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", accentClasses[accent ?? "primary"])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
