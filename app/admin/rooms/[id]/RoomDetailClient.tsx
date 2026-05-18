"use client";

import { useRouter } from "next/navigation";
import BedGrid from "@/components/BedGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, BedDouble, Users, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

interface Room {
  id: number;
  number: string;
  label: string;
  is_full: boolean;
  capacity: number;
  occupied_count: number;
  floor_label: string;
  beds: Bed[];
}

export default function RoomDetailClient({ room }: { room: Room }) {
  const router   = useRouter();
  const [toggling, setToggling] = useState(false);
  const [isFull, setIsFull]     = useState(room.is_full);

  const occupied  = room.occupied_count;
  const vacant    = room.capacity - occupied;
  const pct       = Math.round((occupied / room.capacity) * 100);
  const liveIsFull = occupied >= room.capacity;

  async function toggleFull() {
    setToggling(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_full: !isFull }),
      });
      if (res.ok) {
        setIsFull(!isFull);
        toast.success(isFull ? "Room marked as available" : "Room marked as full");
      }
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Room {room.number}</h1>
            {liveIsFull && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20">Full</Badge>
            )}
            {isFull && !liveIsFull && (
              <Badge variant="outline" className="border-warning/40 text-warning text-xs">Manually Closed</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">{room.floor_label}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFull}
          disabled={toggling}
          className={isFull ? "border-success/40 text-success hover:bg-success/10" : "border-warning/40 text-warning hover:bg-warning/10"}
        >
          {toggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFull ? "Mark Available" : "Mark as Full"}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BedDouble className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="text-xl font-bold">{room.capacity}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Occupied</p>
              <p className="text-xl font-bold">{occupied}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <DoorOpen className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vacant</p>
              <p className="text-xl font-bold">{vacant}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Occupancy</span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${liveIsFull ? "bg-destructive" : pct > 75 ? "bg-warning" : "bg-success"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Theatre Bed Grid */}
      <BedGrid beds={room.beds} roomNumber={room.number} onRefresh={() => router.refresh()} />
    </div>
  );
}
