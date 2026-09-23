import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        blue: "border-transparent bg-blue-100 text-blue-700",
        purple: "border-transparent bg-purple-100 text-purple-700",
        amber: "border-transparent bg-amber-100 text-amber-700",
        teal: "border-transparent bg-teal-100 text-teal-700",
        cyan: "border-transparent bg-cyan-100 text-cyan-700",
        rose: "border-transparent bg-rose-100 text-rose-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
