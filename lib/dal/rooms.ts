import { sql } from "@/lib/db";

export interface Floor {
  id: number;
  name: string;
  label: string;
}

export interface Room {
  id: number;
  floor_id: number;
  number: string;
  label: string;
  is_full: boolean;
  capacity: number;
  created_at: string;
  floor_name?: string;
  floor_label?: string;
  occupied_count: number;
}

export async function getAllRooms(): Promise<Room[]> {
  const rows = await sql`
    SELECT 
      r.*, 
      f.name AS floor_name, 
      f.label AS floor_label,
      COUNT(ba.id)::int AS occupied_count
    FROM rooms r
    JOIN floors f ON f.id = r.floor_id
    LEFT JOIN beds b ON b.room_id = r.id
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    GROUP BY r.id, f.name, f.label
    ORDER BY f.name, r.number
  `;
  return rows as Room[];
}

export async function getRoomById(id: number): Promise<Room | null> {
  const rows = await sql`
    SELECT r.*, f.name AS floor_name, f.label AS floor_label,
      COUNT(ba.id)::int AS occupied_count
    FROM rooms r
    JOIN floors f ON f.id = r.floor_id
    LEFT JOIN beds b ON b.room_id = r.id
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    WHERE r.id = ${id}
    GROUP BY r.id, f.name, f.label
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
}

export async function getRoomWithBeds(roomId: number): Promise<BedWithResident[]> {
  const rows = await sql`
    SELECT 
      b.id, b.room_id, b.number, b.position, b.is_occupied,
      res.id AS resident_id,
      res.name AS resident_name,
      res.phone AS resident_phone,
      ba.id AS assignment_id
    FROM beds b
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.vacated_at IS NULL
    LEFT JOIN residents res ON res.id = ba.resident_id
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
