"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHostel } from "@/lib/hostel-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BedDouble, ChevronRight, Search, X } from "lucide-react";
import { RoomsSkeleton } from "@/components/skeletons";

interface Room {
  id: number;
  number: string;
  capacity: number;
  occupied_count: number;
  floor_label: string;
  room_type: string;
  hostel_name?: string;
  pending_payments_count?: number;
}

interface BedSearchResult {
  bed_id: number;
  bed_number: string;
  room_id: number;
  room_number: string;
  floor_label: string;
  hostel_name: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const { hostelParam, label, isLoading: hostelLoading } = useHostel();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hostelLoading) return;
    const controller = new AbortController();
    setLoading(true);
    const url = hostelParam ? `/api/rooms?hostel=${hostelParam}` : `/api/rooms`;
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setRooms(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { console.error(err); setLoading(false); } });
    return () => controller.abort();
  }, [hostelParam, hostelLoading]);

  // Bed search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/beds/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelectResult(result: BedSearchResult) {
    setShowDropdown(false);
    setQuery("");
    router.push(`/admin/rooms/${result.room_id}`);
  }

  if (loading || hostelLoading) {
    return <RoomsSkeleton />;
  }

  const byFloor = rooms.reduce<Record<string, Room[]>>((acc, room) => {
    const key = hostelParam
      ? (room.floor_label ?? "Other")
      : `${room.hostel_name ?? ""} · ${room.floor_label ?? "Other"}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {});

  const floorNumber = (label: string) => {
    const m = label.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 999;
  };
  const sortedGroups = Object.entries(byFloor).sort(([a], [b]) => {
    const [aHostel = "", aFloor = a] = a.split(" · ");
    const [bHostel = "", bFloor = b] = b.split(" · ");
    const hostelCmp = aHostel.localeCompare(bHostel);
    if (hostelCmp !== 0) return hostelCmp;
    return floorNumber(aFloor) - floorNumber(bFloor);
  });

  const totalBeds = rooms.reduce((a, r) => a + r.capacity, 0);
  const totalOcc = rooms.reduce((a, r) => a + r.occupied_count, 0);

  const roomTypeBadge = (type: string) => {
    if (type === "dormitory") return <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30 ml-1">Dormitory</Badge>;
    if (type === "ac") return <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 ml-1">AC</Badge>;
    return null;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rooms &amp; Beds</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {label} — {totalOcc} of {totalBeds} beds occupied · click a room to manage beds
          </p>
        </div>

        {/* Bed search */}
        <div ref={searchRef} className="relative w-full sm:w-64">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="bed-search-input"
              type="text"
              inputMode="numeric"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              placeholder="Search bed number…"
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 top-full mt-1.5 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
              {searching && (
                <div className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-3 py-2.5 text-xs text-muted-foreground">No beds found</div>
              )}
              {!searching && results.length > 0 && (
                <ul className="max-h-64 overflow-y-auto">
                  {results.map((r) => (
                    <li key={r.bed_id}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); handleSelectResult(r); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors group"
                      >
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <BedDouble className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            Bed <span className="text-primary">#{r.bed_number}</span>
                            <span className="text-muted-foreground font-normal"> · Room {r.room_number}</span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.hostel_name} · {r.floor_label}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {sortedGroups.map(([floorLabel, floorRooms]) => {
        const floorOcc = floorRooms.reduce((a, r) => a + r.occupied_count, 0);
        const floorCap = floorRooms.reduce((a, r) => a + r.capacity, 0);
        const floorPct = Math.round((floorOcc / floorCap) * 100);
        return (
          <div key={floorLabel}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold">{floorLabel}</h2>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                {floorOcc}/{floorCap} · {floorPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {floorRooms.map((room) => {
                const occupied = room.occupied_count;
                const isFull = occupied >= room.capacity;
                const pct = Math.round((occupied / room.capacity) * 100);
                const barColor = isFull
                  ? "bg-destructive"
                  : pct > 75 ? "bg-warning" : pct > 0 ? "bg-success" : "bg-muted-foreground/20";

                return (
                  <Link key={room.id} href={`/admin/rooms/${room.id}`}>
                    <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-border/60 group">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isFull ? "bg-destructive/10" : "bg-primary/8"}`}>
                            <BedDouble className={`h-4 w-4 ${isFull ? "text-destructive" : "text-primary"}`} />
                          </div>
                          <div className="flex items-center">
                            <CardTitle className="text-base font-semibold">{room.number}</CardTitle>
                            {roomTypeBadge(room.room_type)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isFull && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0">Full</Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold ${isFull ? "border-destructive/30 text-destructive" : occupied > 0 ? "border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {occupied}/{room.capacity}
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {pct}% occupied · <span className="font-medium text-foreground">{room.capacity - occupied}</span> beds free
                          </p>
                          {(room.pending_payments_count ?? 0) > 0 && (
                            <span className="text-[10px] font-medium text-warning bg-warning/10 border border-warning/20 px-1.5 py-px rounded flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                              {room.pending_payments_count} unpaid {room.pending_payments_count === 1 ? "payment" : "payments"}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
