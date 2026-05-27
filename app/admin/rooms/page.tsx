"use client";

import { useEffect, useState } from "react";
import { useHostel } from "@/lib/hostel-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BedDouble, ChevronRight } from "lucide-react";

interface Room {
  id: number;
  number: string;
  capacity: number;
  occupied_count: number;
  floor_label: string;
  room_type: string;
  hostel_name?: string;
}

export default function RoomsPage() {
  const { hostelParam, label, isLoading: hostelLoading } = useHostel();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hostelLoading) return;
    setLoading(true);
    const url = hostelParam ? `/api/rooms?hostel=${hostelParam}` : `/api/rooms`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setRooms(data); setLoading(false); });
  }, [hostelParam, hostelLoading]);

  if (loading || hostelLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div><div className="h-7 w-48 rounded bg-muted" /><div className="h-4 w-72 rounded bg-muted/60 mt-2" /></div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, j) => <div key={j} className="h-28 rounded-xl bg-muted/50" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const byFloor = rooms.reduce<Record<string, Room[]>>((acc, room) => {
    // When showing all hostels, prefix with hostel name for clear grouping
    const key = hostelParam
      ? (room.floor_label ?? "Other")
      : `${room.hostel_name ?? ""} · ${room.floor_label ?? "Other"}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {});

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
          <h1 className="text-2xl font-bold tracking-tight">Rooms & Beds</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {label} — {totalOcc} of {totalBeds} beds occupied · click a room to manage beds
          </p>
        </div>
      </div>

      {Object.entries(byFloor).map(([floorLabel, floorRooms]) => {
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
                        <p className="text-xs text-muted-foreground mt-2">
                          {pct}% occupied · <span className="font-medium text-foreground">{room.capacity - occupied}</span> beds free
                        </p>
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
