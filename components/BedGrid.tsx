"use client";

import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Search, UserPlus, UserX, Loader2, ArrowRightLeft } from "lucide-react";
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
  is_staff: boolean;
}

interface Resident {
  id: number;
  name: string;
  phone: string | null;
  bed_number: string | null;
  is_staff: boolean;
}

interface BedGridProps {
  beds: Bed[];
  roomNumber: string;
  onRefresh: () => void;
}

const formatName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30",
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30",
    "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30",
    "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30",
    "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30",
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30",
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function BedGrid({ beds, roomNumber, onRefresh }: BedGridProps) {
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allResidents, setAllResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [vacating, setVacating] = useState(false);
  const [pendingResident, setPendingResident] = useState<Resident | null>(null);

  // Fetch all active people (residents + staff) — no is_staff filter, so both come back
  useEffect(() => {
    if (!open) return;

    setLoadingResidents(true);
    const trimmed = search.trim();

    const params = new URLSearchParams({ active_only: "true", limit: "50" });
    if (trimmed) params.set("search", trimmed);

    const timeout = setTimeout(() => {
      fetch(`/api/residents?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setAllResidents(data.data ?? []))
        .catch(() => setAllResidents([]))
        .finally(() => setLoadingResidents(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [open, search]);

  // Show everyone — those with a bed will get a warning badge & confirmation
  const results = allResidents;

  const handleBedClick = useCallback((bed: Bed) => {
    setSelectedBed(bed);
    setSearch("");
    setOpen(true);
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
      setPendingResident(null);
    }
  }, [selectedBed, onRefresh]);

  const handleResidentClick = useCallback((resident: Resident) => {
    if (resident.bed_number) {
      // Resident already has a bed — ask for double confirmation
      setPendingResident(resident);
    } else {
      handleAssign(resident.id);
    }
  }, [handleAssign]);

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
            <span className="inline-block w-3 h-3 rounded-sm bg-purple-500/20 border border-purple-500/40" />
            Staff
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
                      ? bed.is_staff
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400"
                        : "bg-success/15 border-success/40 text-success"
                      : "bg-muted/30 border-border/50 text-muted-foreground/60 hover:border-primary/50"
                  )}
                >
                  <BedDouble className="h-4 w-4 mb-1 shrink-0" />
                  <span className="font-semibold text-[11px]">{bed.number.split("-").slice(1).join("-")}</span>
                  {bed.is_occupied && bed.resident_name ? (
                    <span className={cn("truncate w-full text-center text-[10px] leading-tight mt-0.5", bed.is_staff ? "text-purple-700 dark:text-purple-400/90" : "text-success/80")}>
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

            <div className="space-y-3">
              <p className="text-sm font-semibold tracking-tight text-foreground/90">
                {selectedBed?.is_occupied ? "Reassign to:" : "Assign resident:"}
              </p>

              <div className="relative group/search">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/80 group-focus-within/search:text-primary transition-colors duration-200" />
                <Input
                  className="pl-9 h-10 rounded-xl bg-muted/20 border-border/60 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loadingResidents && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/80 animate-pulse pl-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Searching database...
                </div>
              )}

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto px-1">
                {results.map((r) => {
                  const hasExistingBed = Boolean(r.bed_number);
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleResidentClick(r)}
                      disabled={assigning}
                      className="w-full flex items-center gap-2.5 rounded-lg border border-border/50 bg-card py-2 px-3 text-sm text-left hover:bg-accent/40 hover:border-primary/20 transition-all duration-150 group disabled:opacity-50 cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold uppercase tracking-wide",
                        getAvatarColor(r.name)
                      )}>
                        {getInitials(r.name)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-150 truncate text-[13px]">
                            {formatName(r.name)}
                          </p>
                          {r.is_staff && (
                            <Badge className="h-4 px-1.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50">
                              Staff
                            </Badge>
                          )}
                          {hasExistingBed && (
                            <Badge className="h-4 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              Bed {r.bed_number}
                            </Badge>
                          )}
                        </div>
                        {r.phone && (
                          <p className="text-[11px] text-muted-foreground/70 leading-none mt-0.5">{r.phone}</p>
                        )}
                      </div>

                      {/* Action Icon */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border/50 bg-background group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-150">
                        {assigning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : hasExistingBed ? (
                          <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {!loadingResidents && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed rounded-xl border-border/60 bg-muted/10 text-center animate-in fade-in-50 duration-300">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {search.length > 0 ? "No matching results" : "No active residents found"}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
                      {search.length > 0 ? "Try adjusting your spelling or search term" : "Check back later or register a new resident"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Double-confirmation dialog for residents with an existing bed */}
      <AlertDialog open={Boolean(pendingResident)} onOpenChange={(o) => { if (!o) setPendingResident(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move resident to a new bed?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">{pendingResident ? formatName(pendingResident.name) : ""}</span> is currently assigned to bed{" "}
                  <span className="font-semibold text-foreground">{pendingResident?.bed_number}</span>.
                </p>
                <p>
                  Assigning them here will <span className="font-semibold text-amber-600 dark:text-amber-400">vacate their current bed</span> and move them to bed{" "}
                  <span className="font-semibold text-foreground">{selectedBed?.number}</span>.
                </p>
                <p>Are you sure you want to continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingResident(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => { if (pendingResident) handleAssign(pendingResident.id); }}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
              Yes, move them
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
