"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Downloading and printing both open the browser's native print dialog —
// choosing "Save as PDF" there gives a crisp, correctly-paginated PDF
// without a separate PDF-rendering dependency.
export function DownloadButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <Download className="h-4 w-4" /> Download
    </Button>
  );
}
