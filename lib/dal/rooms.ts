import { sql } from "@/lib/db";

export interface Floor {
  id: number;
  name: string;
  label: string;
  hostel_id: number;
}

export interface Room {
  id: number;
  floor_id: number;
  number: string;
  label: string;
  is_full: boolean;
  capacity: number;
  room_type: string;
  created_at: string;
  floor_name?: string;
  floor_label?: string;
  hostel_id?: number;
  hostel_name?: string;
  occupied_count: number;
  pending_payments_count?: number;
}

export async function getAllRooms(hostelId?: number): Promise<Room[]> {
  const rows = await sql`
    SELECT 
      r.*, 
      r.room_type,
      f.name AS floor_name, 
      f.label AS floor_label,
      f.hostel_id,
      h.name AS hostel_name,
      COUNT(ba.id)::int AS occupied_count,
      COUNT(CASE WHEN p.paid = false AND COALESCE(res.is_staff, false) = false THEN 1 END)::int AS pending_payments_count
    FROM rooms r
    JOIN floors f ON f.id = r.floor_id
    JOIN hostels h ON h.id = f.hostel_id
    LEFT JOIN beds b ON b.room_id = r.id
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    LEFT JOIN residents res ON res.id = ba.resident_id
    LEFT JOIN payments p ON p.resident_id = ba.resident_id AND p.month = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date
    WHERE (${hostelId ?? null}::int IS NULL OR f.hostel_id = ${hostelId ?? null})
    GROUP BY r.id, f.name, f.label, f.hostel_id, h.name
    ORDER BY f.name, r.number
  `;
  return rows as Room[];
}

export async function getRoomById(id: number): Promise<Room | null> {
  const rows = await sql`
    SELECT r.*, r.room_type, f.name AS floor_name, f.label AS floor_label,
      f.hostel_id, h.name AS hostel_name,
      COUNT(ba.id)::int AS occupied_count
    FROM rooms r
    JOIN floors f ON f.id = r.floor_id
    JOIN hostels h ON h.id = f.hostel_id
    LEFT JOIN beds b ON b.room_id = r.id
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    WHERE r.id = ${id}
    GROUP BY r.id, f.name, f.label, f.hostel_id, h.name
  `;
  return (rows[0] as Room) ?? null;
}

export interface BedWithResident {
  id: number;
  room_id: number;
  number: string;
  position: number;
  is_occupied: boolean;
  resident_id: number | null;
  resident_name: string | null;
  resident_phone: string | null;
  assignment_id: number | null;
  is_staff: boolean;
  payment_id: number | null;
  payment_paid: boolean | null;
  payment_amount: number | null;
  payment_fine: number | null;
}

export async function getRoomWithBeds(roomId: number): Promise<BedWithResident[]> {
  const rows = await sql`
    SELECT 
      b.id, b.room_id, b.number, b.position,
      (ba.id IS NOT NULL) AS is_occupied,
      res.id AS resident_id,
      res.name AS resident_name,
      res.phone AS resident_phone,
      COALESCE(res.is_staff, false) AS is_staff,
      ba.id AS assignment_id,
      p.id AS payment_id,
      p.paid AS payment_paid,
      p.amount AS payment_amount,
      p.fine_amount AS payment_fine
    FROM beds b
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    LEFT JOIN residents res ON res.id = ba.resident_id
    LEFT JOIN payments p ON p.resident_id = res.id AND p.month = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date
    WHERE b.room_id = ${roomId}
    ORDER BY b.position
  `;
  return rows as BedWithResident[];
}

/**
 * Recomputes the is_full flag for a room based on actual occupancy.
 * Call this after any assign/vacate operation.
 */
export async function syncRoomFullStatus(roomId: number): Promise<void> {
  await sql`
    UPDATE rooms r
    SET is_full = (
      SELECT COUNT(ba.id) >= r.capacity
      FROM beds b
      LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
      WHERE b.room_id = r.id
    )
    WHERE r.id = ${roomId}
  `;
}

export async function setRoomFull(id: number, isFull: boolean): Promise<void> {
  await sql`UPDATE rooms SET is_full = ${isFull} WHERE id = ${id}`;
}
