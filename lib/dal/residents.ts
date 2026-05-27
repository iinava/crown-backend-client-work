import { sql } from "@/lib/db";
import { syncRoomFullStatus } from "@/lib/dal/rooms";

export interface Resident {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  monthly_rate: string;
  move_in_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bed_number?: string | null;
  room_number?: string | null;
  room_id?: number | null;
  bed_id?: number | null;
  hostel_name?: string | null;
  hostel_id?: number | null;
  /** true = has an unpaid payment row this month; false = paid OR no row yet */
  has_unpaid?: boolean;
  /** true = a payment row exists for this month */
  has_payment?: boolean;
}

export interface ResidentListParams {
  search?: string;
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
  hostelId?: number;
}

export async function getResidents(params: ResidentListParams = {}): Promise<{
  data: Resident[];
  total: number;
}> {
  const { search = "", limit = 20, offset = 0, activeOnly = false, hostelId } = params;
  const searchPattern = `%${search}%`;

  const data = await sql`
    SELECT 
      r.*,
      b.number AS bed_number,
      rm.number AS room_number,
      rm.id AS room_id,
      b.id AS bed_id,
      h.name AS hostel_name,
      h.id AS hostel_id,
      EXISTS (
        SELECT 1 FROM payments p 
        WHERE p.resident_id = r.id 
          AND p.month = DATE_TRUNC('month', CURRENT_DATE)
          AND p.paid = false
      ) AS has_unpaid,
      EXISTS (
        SELECT 1 FROM payments p 
        WHERE p.resident_id = r.id 
          AND p.month = DATE_TRUNC('month', CURRENT_DATE)
      ) AS has_payment
    FROM residents r
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    LEFT JOIN hostels h ON h.id = fl.hostel_id
    WHERE 
      (${search} = '' OR r.name ILIKE ${searchPattern} OR r.phone ILIKE ${searchPattern} OR r.email ILIKE ${searchPattern})
      AND (${activeOnly} = false OR r.is_active = true)
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
    ORDER BY r.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRow = await sql`
    SELECT COUNT(*)::int AS total FROM residents r
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    WHERE 
      (${search} = '' OR r.name ILIKE ${searchPattern} OR r.phone ILIKE ${searchPattern} OR r.email ILIKE ${searchPattern})
      AND (${activeOnly} = false OR r.is_active = true)
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
  `;

  return { data: data as Resident[], total: countRow[0].total };
}

export async function getResidentById(id: number): Promise<Resident | null> {
  const rows = await sql`
    SELECT 
      r.*,
      b.number AS bed_number,
      rm.number AS room_number,
      b.id AS bed_id,
      rm.id AS room_id,
      h.name AS hostel_name,
      h.id AS hostel_id
    FROM residents r
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    LEFT JOIN hostels h ON h.id = fl.hostel_id
    WHERE r.id = ${id}
  `;
  return (rows[0] as Resident) ?? null;
}

export interface CreateResidentData {
  name: string;
  phone?: string;
  email?: string;
  id_number?: string;
  monthly_rate: number;
  move_in_date?: string;
  notes?: string;
}

export async function createResident(data: CreateResidentData): Promise<Resident> {
  const rows = await sql`
    INSERT INTO residents (name, phone, email, id_number, monthly_rate, move_in_date, notes)
    VALUES (${data.name}, ${data.phone || null}, ${data.email || null}, ${data.id_number || null}, ${data.monthly_rate}, ${data.move_in_date || null}, ${data.notes || null})
    RETURNING *
  `;
  return rows[0] as Resident;
}

export interface UpdateResidentData extends Partial<CreateResidentData> {
  is_active?: boolean;
}

export async function updateResident(id: number, data: UpdateResidentData): Promise<Resident | null> {
  // Build update using explicit checks so we can update fields to null/empty
  const rows = await sql`
    UPDATE residents SET
      name        = CASE WHEN ${data.name !== undefined} THEN ${data.name ?? null} ELSE name END,
      phone       = CASE WHEN ${data.phone !== undefined} THEN ${data.phone || null} ELSE phone END,
      email       = CASE WHEN ${data.email !== undefined} THEN ${data.email || null} ELSE email END,
      id_number   = CASE WHEN ${data.id_number !== undefined} THEN ${data.id_number || null} ELSE id_number END,
      monthly_rate = CASE WHEN ${data.monthly_rate !== undefined} THEN ${data.monthly_rate ?? null} ELSE monthly_rate END,
      move_in_date = CASE WHEN ${data.move_in_date !== undefined} THEN ${data.move_in_date || null} ELSE move_in_date END,
      notes       = CASE WHEN ${data.notes !== undefined} THEN ${data.notes || null} ELSE notes END,
      is_active   = CASE WHEN ${data.is_active !== undefined} THEN ${data.is_active ?? null} ELSE is_active END,
      updated_at  = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Resident) ?? null;
}

export async function deleteResident(id: number): Promise<void> {
  // Find which beds this resident occupies so we can sync room status
  const assignments = await sql`
    SELECT b.room_id FROM bed_assignments ba
    JOIN beds b ON b.id = ba.bed_id
    WHERE ba.resident_id = ${id} AND ba.vacated_at IS NULL
  `;
  const roomIds = [...new Set((assignments as { room_id: number }[]).map((a) => a.room_id))];

  // Vacate all active bed assignments
  const vacatedBeds = await sql`
    UPDATE bed_assignments SET vacated_at = NOW()
    WHERE resident_id = ${id} AND vacated_at IS NULL
    RETURNING bed_id
  `;
  // Mark those beds as unoccupied
  if (vacatedBeds.length > 0) {
    const bedIds = (vacatedBeds as { bed_id: number }[]).map((r) => r.bed_id);
    await sql`UPDATE beds SET is_occupied = false WHERE id = ANY(${bedIds})`;
  }

  // Delete resident
  await sql`DELETE FROM residents WHERE id = ${id}`;

  // Sync is_full for affected rooms
  for (const roomId of roomIds) {
    await syncRoomFullStatus(roomId);
  }
}
