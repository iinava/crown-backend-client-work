import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const rows = await sql`
    SELECT
      b.id          AS bed_id,
      b.number      AS bed_number,
      r.id          AS room_id,
      r.number      AS room_number,
      f.label       AS floor_label,
      h.name        AS hostel_name
    FROM beds b
    JOIN rooms r ON r.id = b.room_id
    JOIN floors f ON f.id = r.floor_id
    JOIN hostels h ON h.id = f.hostel_id
    WHERE b.number ILIKE ${"%" + q + "%"}
    ORDER BY
      -- Exact full match
      CASE WHEN b.number = ${q} THEN 0
      -- Exact suffix match: the part after the last '-' equals the query (e.g. "c3-14" ends with "-14")
           WHEN REVERSE(SPLIT_PART(REVERSE(b.number), '-', 1)) = ${q} THEN 1
      -- Ends with query but has a dash before it as a boundary
           WHEN b.number ILIKE ${"%-" + q} THEN 2
      -- Everything else (partial substring)
           ELSE 3
      END,
      h.name,
      f.label,
      b.number
    LIMIT 20
  `;

  return NextResponse.json(rows);
}
