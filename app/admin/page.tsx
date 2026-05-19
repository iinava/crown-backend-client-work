import { getAllRooms } from "@/lib/dal/rooms";

export const dynamic = "force-dynamic";
import { getUnpaidThisMonth } from "@/lib/dal/payments";
import { getResidents } from "@/lib/dal/residents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Users, AlertCircle, CheckCircle2, DoorOpen, TrendingDown } from "lucide-react";
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
    {
      label: "Total Beds",
      value: totalBeds,
      sub: `${rooms.length} rooms`,
      icon: BedDouble,
      colorClass: "text-primary bg-primary/10",
    },
    {
      label: "Occupied",
      value: occupiedBeds,
      sub: `${occupancyPct}% occupancy`,
      icon: Users,
      colorClass: "text-success bg-success/10",
    },
    {
      label: "Vacant",
      value: vacantBeds,
      sub: `${totalBeds - occupiedBeds} beds free`,
      icon: DoorOpen,
      colorClass: "text-warning bg-warning/10",
    },
    {
      label: "Unpaid",
      value: unpaid.length,
      sub: monthLabel,
      icon: TrendingDown,
      colorClass: "text-destructive bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crown Hostel — overview for {monthLabel}
        </p>
      </div>

      {/* Alerts */}
      {unpaid.length > 0 && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{unpaid.length} unpaid payment{unpaid.length > 1 ? "s" : ""} this month</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {unpaid.map((p) => (
                <Link key={p.id} href={`/admin/residents/${p.resident_id}`}>
                  <Badge variant="outline" className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10">
                    {p.resident_name}
                  </Badge>
                </Link>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {unpaid.length === 0 && totalResidents > 0 && (
        <Alert className="border-success/30 bg-success/5 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle className="text-success">All payments collected for {monthLabel}</AlertTitle>
          <AlertDescription className="text-success/80">
            All active residents are up to date.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-sm border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {s.label}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.colorClass}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Occupancy bar */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Overall Occupancy</CardTitle>
            <span className="text-sm font-semibold text-primary">{occupancyPct}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {occupiedBeds} of {totalBeds} beds occupied across {rooms.length} rooms
          </p>
        </CardContent>
      </Card>

      {/* Rooms grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Rooms at a glance</h2>
          <Link href="/admin/rooms" className="text-xs text-primary hover:underline font-medium">
            Manage rooms →
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {rooms.map((room) => {
            const pct = Math.round((room.occupied_count / room.capacity) * 100);
            const isFull = room.occupied_count >= room.capacity;
            return (
              <Link key={room.id} href={`/admin/rooms/${room.id}`}>
                <Card className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-border/60 ${isFull ? "border-destructive/30" : ""}`}>
                  <CardContent className="p-3 text-center">
                    <p className="font-bold text-sm">{room.number}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{room.floor_label}</p>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? "bg-destructive" : pct > 70 ? "bg-warning" : "bg-success"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-medium mt-1.5">
                      {room.occupied_count}/{room.capacity}
                    </p>
                    {isFull && (
                      <span className="inline-block text-[9px] font-semibold text-destructive bg-destructive/10 rounded px-1.5 py-0.5 mt-1">
                        FULL
                      </span>
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
