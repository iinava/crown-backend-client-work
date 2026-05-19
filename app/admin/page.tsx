import { getAllRooms } from "@/lib/dal/rooms";
import { getUnpaidThisMonth } from "@/lib/dal/payments";
import { getResidents } from "@/lib/dal/residents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BedDouble, Users, DoorOpen, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [rooms, unpaid, { total: totalResidents }] = await Promise.all([
    getAllRooms(),
    getUnpaidThisMonth(),
    getResidents({ activeOnly: true }),
  ]);

  const totalBeds    = rooms.reduce((a, r) => a + r.capacity, 0);
  const occupiedBeds = rooms.reduce((a, r) => a + r.occupied_count, 0);
  const vacantBeds   = totalBeds - occupiedBeds;
  const monthLabel   = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const stats = [
    { label: "Total Beds",  value: totalBeds,      sub: `${rooms.length} rooms`,          icon: BedDouble    },
    { label: "Occupied",    value: occupiedBeds,   sub: `${occupancyPct}% occupancy`,     icon: Users        },
    { label: "Vacant",      value: vacantBeds,     sub: `${vacantBeds} beds free`,        icon: DoorOpen     },
    { label: "Unpaid",      value: unpaid.length,  sub: monthLabel,                       icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crown Hostel — {monthLabel}
        </p>
      </div>

      {/* Banner */}
      {unpaid.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 sm:px-5 sm:py-4 text-sm text-destructive-foreground shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{unpaid.length} unpaid this month</span>
          </div>
          <span className="text-destructive-foreground/80 truncate min-w-0 flex-1 text-xs sm:text-sm">
            — {unpaid.slice(0, 3).map((p) => p.resident_name).join(", ")}
            {unpaid.length > 3 && ` and ${unpaid.length - 3} more`}
          </span>
          <Link 
            href="/admin/payments" 
            className="sm:ml-auto shrink-0 text-xs font-medium text-destructive-foreground/90 hover:text-destructive-foreground underline-offset-4 hover:underline self-start sm:self-auto"
          >
            View all
          </Link>
        </div>
      )}

      {unpaid.length === 0 && totalResidents > 0 && (
        <div className="flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">All payments collected</span>
          <span className="text-muted-foreground">for {monthLabel}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Occupancy */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Overall Occupancy</CardTitle>
            <span className="text-sm tabular-nums text-muted-foreground">{occupancyPct}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Progress value={occupancyPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {occupiedBeds} of {totalBeds} beds occupied across {rooms.length} rooms
          </p>
        </CardContent>
      </Card>

      {/* Rooms at a glance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Rooms at a glance</h2>
          <Link href="/admin/rooms" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Manage rooms
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {rooms.map((room) => {
            const pct    = Math.round((room.occupied_count / room.capacity) * 100);
            const isFull = room.occupied_count >= room.capacity;
            return (
              <Link key={room.id} href={`/admin/rooms/${room.id}`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardContent className="p-3 text-center">
                    <p className="font-medium text-sm">{room.number}</p>
                    <p className="text-[10px] text-muted-foreground">{room.floor_label}</p>
                    <Progress value={pct} className="h-1 mt-2" />
                    <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                      {room.occupied_count}/{room.capacity}
                    </p>
                    {isFull && (
                      <span className="text-[10px] font-medium text-destructive">Full</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
