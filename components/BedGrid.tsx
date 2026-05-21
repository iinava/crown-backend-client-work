"use client";

import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Search, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Bed {
  id: number;
  number: string;
  position: number;
  is_occupied: boolean;
  resident_id: number | null;
  resident_name: string | null;
  resident_phone: string | null;
  assignment_id: number | null;
}

interface Resident {
  id: number;
  name: string;
  phone: string | null;
  bed_number: string | null;
}

interface BedGridProps {
  beds: Bed[];
  roomNumber: string;
  onRefresh: () => void;
}

export default function BedGrid({ beds, roomNumber, onRefresh }: BedGridProps) {
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allResidents, setAllResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [vacating, setVacating] = useState(false);

  // Load all active residents once when the sheet opens
  useEffect(() => {
    if (!open) return;
    setLoadingResidents(true);
    fetch(`/api/residents?limit=200&active_only=true`)
      .then((r) => r.json())
      .then((data) => setAllResidents(data.data ?? []))
      .catch(() => setAllResidents([]))
      .finally(() => setLoadingResidents(false));
  }, [open]);

  // Client-side filter
  const results = search.trim().length === 0
    ? allResidents
    : allResidents.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.phone ?? "").toLowerCase().includes(q)
        );
      });

  const handleBedClick = useCallback((bed: Bed) => {
    setSelectedBed(bed);
    setSearch("");
    setOpen(true);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
  }, []);

  const handleAssign = useCallback(async (residentId: number) => {
    if (!selectedBed) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/beds/${selectedBed.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resident_id: residentId }),
      });
      if (res.ok) {
        toast.success("Bed assigned successfully");
        setOpen(false);
        onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to assign");
      }
    } finally {
      setAssigning(false);
    }
  }, [selectedBed, onRefresh]);

  const handleVacate = useCallback(async () => {
    if (!selectedBed) return;
    setVacating(true);
    try {
      const res = await fetch(`/api/beds/${selectedBed.id}/assign`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Bed vacated");
        setOpen(false);
        onRefresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to vacate");
      }
    } finally {
      setVacating(false);
    }
  }, [selectedBed, onRefresh]);

  // 5 rows × 4 cols layout
  const rows: Bed[][] = [];
  for (let i = 0; i < beds.length; i += 4) {
    rows.push(beds.slice(i, i + 4));
  }

  return (
    <>
      <div className="space-y-3">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-success/20 border border-success/40" />
            Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-background border" />
            Vacant
          </span>
        </div>

        {/* Theatre Grid */}
        <div className="space-y-2">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-2 justify-center">
              {row.map((bed) => (
                <button
                  key={bed.id}
                  onClick={() => handleBedClick(bed)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all hover:scale-105 hover:shadow-sm",
                    "w-[calc(25%-6px)] min-w-[80px] min-h-[64px]",
                    bed.is_occupied
                      ? "bg-success/15 border-success/40 text-success"
                      : "bg-muted/30 border-border/50 text-muted-foreground/60 hover:border-primary/50"
                  )}
                >
                  <BedDouble className="h-4 w-4 mb-1 shrink-0" />
                  <span className="font-semibold">{bed.number.split("-")[1]}</span>
                  {bed.is_occupied && bed.resident_name ? (
                    <span className="truncate w-full text-center text-[10px] leading-tight mt-0.5 text-success/80">
                      {bed.resident_name.split(" ")[0]}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60">Empty</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Room screen label */}
        <div className="flex justify-center mt-4">
          <div className="bg-muted rounded px-6 py-1.5 text-xs text-muted-foreground font-medium tracking-widest uppercase">
            Room {roomNumber} — Entrance
          </div>
        </div>
      </div>

      {/* Assignment Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              Bed {selectedBed?.number}
              {selectedBed?.is_occupied && (
                <Badge variant="secondary" className="ml-2">Occupied</Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {selectedBed?.is_occupied
                ? `Currently assigned to ${selectedBed.resident_name}`
                : "This bed is vacant. Search for a resident to assign."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {selectedBed?.is_occupied && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleVacate}
                disabled={vacating}
              >
                {vacating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                Vacate Bed
              </Button>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {selectedBed?.is_occupied ? "Reassign to:" : "Assign resident:"}
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {loadingResidents && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading residents...
                </div>
              )}

              <div className="space-y-1 max-h-72 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAssign(r.id)}
                    disabled={assigning}
                    className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="text-left">
                      <p className="font-medium">{r.name}</p>
                      {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {r.bed_number && (
                        <Badge variant="outline" className="text-xs">{r.bed_number}</Badge>
                      )}
                      {assigning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
                {!loadingResidents && results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {search.length > 0 ? "No residents match your search" : "No active residents found"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
