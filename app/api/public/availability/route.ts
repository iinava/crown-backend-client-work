import { sql } from "@/lib/db";
import { NextRequest } from "next/server";

// No authentication — public endpoint
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hostelSlug = searchParams.get("hostel") ?? undefined;

  // Single query: hostels → floors → rooms → beds with occupancy status
  // Deliberately excludes resident_id and all personal data
  const rows = await sql`
    SELECT
      h.name             AS hostel_name,
      h.slug             AS hostel_slug,
      fl.id              AS floor_id,
      fl.label           AS floor_label,
      r.id               AS room_id,
      r.label            AS room_label,
      r.capacity,
      r.room_type,
      b.id               AS bed_id,
      b.number           AS bed_number,
      CASE WHEN ba.id IS NOT NULL THEN 'occupied' ELSE 'free' END AS status
    FROM hostels h
    JOIN floors fl ON fl.hostel_id = h.id
    JOIN rooms r  ON r.floor_id = fl.id
    JOIN beds  b  ON b.room_id  = r.id
    LEFT JOIN bed_assignments ba
           ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    WHERE (${hostelSlug ?? null}::text IS NULL OR h.slug = ${hostelSlug ?? null})
    ORDER BY h.id, fl.id, r.id, b.number
  `;

  // Shape: group into hostels → floors → rooms → beds
  type RowType = {
    hostel_name: string; hostel_slug: string;
    floor_id: number; floor_label: string;
    room_id: number; room_label: string; capacity: number; room_type: string;
    bed_id: number; bed_number: string; status: "free" | "occupied";
  };

  const hostelsMap = new Map<string, {
    name: string;
    slug: string;
    floorsMap: Map<number, {
      id: number; label: string;
      rooms: Map<number, {
        id: number; label: string; capacity: number; room_type: string;
        beds: { number: string; status: "free" | "occupied" }[];
      }>;
    }>;
  }>();

  for (const row of rows as RowType[]) {
    if (!hostelsMap.has(row.hostel_slug)) {
      hostelsMap.set(row.hostel_slug, {
        name: row.hostel_name,
        slug: row.hostel_slug,
        floorsMap: new Map(),
      });
    }
    const hostel = hostelsMap.get(row.hostel_slug)!;

    if (!hostel.floorsMap.has(row.floor_id)) {
      hostel.floorsMap.set(row.floor_id, {
        id: row.floor_id,
        label: row.floor_label,
        rooms: new Map(),
      });
    }
    const floor = hostel.floorsMap.get(row.floor_id)!;

    if (!floor.rooms.has(row.room_id)) {
      floor.rooms.set(row.room_id, {
        id: row.room_id,
        label: row.room_label,
        capacity: row.capacity,
        room_type: row.room_type,
        beds: [],
      });
    }
    floor.rooms.get(row.room_id)!.beds.push({
      number: row.bed_number,
      status: row.status,
    });
  }

  // Convert maps → arrays, compute roll-up counts
  const hostels = Array.from(hostelsMap.values()).map((hostel) => {
    const floors = Array.from(hostel.floorsMap.values()).map((floor) => {
      const rooms = Array.from(floor.rooms.values()).map((room) => {
        const occupied = room.beds.filter((b) => b.status === "occupied").length;
        const free = room.beds.filter((b) => b.status === "free").length;
        return {
          id: room.id,
          label: room.label,
          capacity: room.capacity,
          room_type: room.room_type,
          occupied,
          free,
          beds: room.beds,
        };
      });

      const floorOccupied = rooms.reduce((a, r) => a + r.occupied, 0);
      const floorFree = rooms.reduce((a, r) => a + r.free, 0);

      return {
        id: floor.id,
        label: floor.label,
        occupied: floorOccupied,
        free: floorFree,
        rooms,
      };
    });

    const totalOccupied = floors.reduce((a, f) => a + f.occupied, 0);
    const totalFree = floors.reduce((a, f) => a + f.free, 0);

    return {
      name: hostel.name,
      slug: hostel.slug,
      summary: {
        total_beds: totalOccupied + totalFree,
        occupied: totalOccupied,
        free: totalFree,
      },
      floors,
    };
  });

  return Response.json(
    { hostels },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
