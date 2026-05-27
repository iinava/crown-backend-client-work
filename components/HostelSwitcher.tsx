"use client";

import { useHostel } from "@/lib/hostel-context";
import { Building2 } from "lucide-react";

export function HostelSwitcher() {
  const { hostels, current, setHostel, isLoading } = useHostel();

  if (isLoading || hostels.length === 0) return null;

  const options = [
    { slug: "all", label: "All" },
    ...hostels.map((h) => ({ slug: h.slug, label: h.name.replace("Crown ", "C") })),
  ];

  const activeSlug = current?.slug ?? "all";

  return (
    <div className="px-2 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1.5 font-medium">
        View
      </p>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.slug}
            onClick={() => setHostel(o.slug)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSlug === o.slug
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "bg-sidebar-accent/50 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            {o.slug === "all" ? null : <Building2 className="h-3 w-3" />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
