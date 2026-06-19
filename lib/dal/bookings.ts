import { sql } from "@/lib/db";

export interface Booking {
  id: number;
  resident_id: number;
  bed_id: number;
  for_month: string;        // "YYYY-MM"
  advance_amount: string;
  advance_paid_at: string | null;
  advance_method: string;
  status: string;           // "confirmed" | "converted"
  notes: string | null;
  created_at: string;
  // Joined
  resident_name?: string;
  resident_phone?: string | null;
  bed_number?: string;
  room_number?: string;
  hostel_name?: string;
}

export interface CreateBookingData {
  resident_id: number;
  bed_id: number;
  for_month: string;        // "YYYY-MM"
  advance_amount: number;
  advance_paid_at?: string;
  advance_method?: string;
  notes?: string;
}

export async function getBookings(params: {
  for_month?: string;
  hostelId?: number;
  status?: string;
} = {}): Promise<Booking[]> {
  const { for_month, hostelId, status } = params;

  const rows = await sql`
    SELECT
      bk.*,
      r.name    AS resident_name,
      r.phone   AS resident_phone,
      b.number  AS bed_number,
      rm.number AS room_number,
      h.name    AS hostel_name
    FROM bookings bk
    JOIN residents r  ON r.id  = bk.resident_id
    JOIN beds b       ON b.id  = bk.bed_id
    JOIN rooms rm     ON rm.id = b.room_id
    JOIN floors fl    ON fl.id = rm.floor_id
    JOIN hostels h    ON h.id  = fl.hostel_id
    WHERE
      (${for_month ?? null}::text IS NULL OR bk.for_month = ${for_month ?? null})
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
      AND (${status ?? null}::text IS NULL OR bk.status = ${status ?? null})
    ORDER BY bk.created_at DESC
  `;
  return rows as Booking[];
}

export async function createBooking(data: CreateBookingData): Promise<Booking> {
  const rows = await sql`
    INSERT INTO bookings (resident_id, bed_id, for_month, advance_amount, advance_paid_at, advance_method, notes)
    VALUES (
      ${data.resident_id},
      ${data.bed_id},
      ${data.for_month},
      ${data.advance_amount},
      ${data.advance_paid_at ?? null},
      ${data.advance_method ?? "cash"},
      ${data.notes ?? null}
    )
    RETURNING *
  `;
  return rows[0] as Booking;
}

export async function deleteBooking(id: number): Promise<void> {
  await sql`DELETE FROM bookings WHERE id = ${id}`;
}

/**
 * Called by generateMonthlyPayments for each resident.
 * Returns the confirmed booking for this resident+month (if any).
 */
export async function getConfirmedBookingForResidentMonth(
  residentId: number,
  month: string   // "YYYY-MM"
): Promise<Booking | null> {
  const rows = await sql`
    SELECT * FROM bookings
    WHERE resident_id = ${residentId}
      AND for_month = ${month}
      AND status = 'confirmed'
    LIMIT 1
  `;
  return (rows[0] as Booking) ?? null;
}

export async function markBookingConverted(id: number): Promise<void> {
  await sql`UPDATE bookings SET status = 'converted' WHERE id = ${id}`;
}
