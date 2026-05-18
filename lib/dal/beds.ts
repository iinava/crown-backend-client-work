import { sql } from "@/lib/db";
import { syncRoomFullStatus } from "@/lib/dal/rooms";

export async function assignBed(bedId: number, residentId: number): Promise<void> {
  // Get the room of this bed so we can sync is_full after
  const bedRows = await sql`SELECT room_id FROM beds WHERE id = ${bedId}`;
  const roomId: number = bedRows[0]?.room_id;

  // Vacate any current occupant of this bed
  await sql`
    UPDATE bed_assignments SET vacated_at = NOW()
    WHERE bed_id = ${bedId} AND vacated_at IS NULL
  `;

  // Get the previous bed of the incoming resident and vacate it
  const prevAssign = await sql`
    SELECT bed_id FROM bed_assignments WHERE resident_id = ${residentId} AND vacated_at IS NULL LIMIT 1
  `;
  if (prevAssign.length > 0) {
    const prevBedId = prevAssign[0].bed_id;
    await sql`UPDATE bed_assignments SET vacated_at = NOW() WHERE resident_id = ${residentId} AND vacated_at IS NULL`;
    await sql`UPDATE beds SET is_occupied = false WHERE id = ${prevBedId}`;

    // Sync is_full for the room the resident is moving from (may differ)
    const prevBedRows = await sql`SELECT room_id FROM beds WHERE id = ${prevBedId}`;
    const prevRoomId: number = prevBedRows[0]?.room_id;
    if (prevRoomId && prevRoomId !== roomId) {
      await syncRoomFullStatus(prevRoomId);
    }
  }

  // Create new assignment
  await sql`
    INSERT INTO bed_assignments (bed_id, resident_id) VALUES (${bedId}, ${residentId})
  `;
  // Mark bed occupied
  await sql`UPDATE beds SET is_occupied = true WHERE id = ${bedId}`;

  // Sync is_full for destination room
  if (roomId) await syncRoomFullStatus(roomId);
}

export async function vacateBed(bedId: number): Promise<void> {
  const bedRows = await sql`SELECT room_id FROM beds WHERE id = ${bedId}`;
  const roomId: number = bedRows[0]?.room_id;

  await sql`
    UPDATE bed_assignments SET vacated_at = NOW()
    WHERE bed_id = ${bedId} AND vacated_at IS NULL
  `;
  await sql`UPDATE beds SET is_occupied = false WHERE id = ${bedId}`;

  if (roomId) await syncRoomFullStatus(roomId);
}

export async function getBedById(bedId: number) {
  const rows = await sql`SELECT * FROM beds WHERE id = ${bedId}`;
  return rows[0] ?? null;
}
