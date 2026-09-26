"use client";

import { useRef } from "react";
import { Plane } from "lucide-react";

export function QuotationGeneratedAnimation({ onDone }: { onDone: () => void }) {
  const firedRef = useRef(false);

  function fireOnce() {
    if (firedRef.current) return;
    firedRef.current = true;
    onDone();
  }

  return (
    <div className="animate-fly-across-backdrop fixed inset-0 z-[100] flex items-center overflow-hidden bg-background/70 backdrop-blur-sm">
      <div
        className="animate-fly-across-banner flex items-center will-change-transform"
        onAnimationEnd={fireOnce}
      >
        <Plane className="h-10 w-10 shrink-0 -rotate-45 text-primary drop-shadow-lg" />
        <span className="h-0.5 w-8 shrink-0 -translate-x-1 bg-foreground/30" />
        <div
          className="flex -translate-x-2 items-center rounded-r-md bg-gradient-to-r from-primary to-accent py-2.5 pr-5 pl-4 text-sm font-bold whitespace-nowrap text-white shadow-lg"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10% 50%)" }}
        >
          Quotation Generated!
        </div>
      </div>
    </div>
  );
}
