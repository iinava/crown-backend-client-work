"use client";

import { useHostel } from "@/lib/hostel-context";
import { Badge } from "@/components/ui/badge";

/**
 * Displays the currently active hostel filter as a small badge.
 * Only visible on mobile (md:hidden is applied by the parent header).
 */
export function HostelBadge() {
  const { label, isLoading } = useHostel();

  if (isLoading) return null;

  return (
    <Badge
      variant="outline"
      className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground border-muted-foreground/30"
    >
      {label}
    </Badge>
  );
}
