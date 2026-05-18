import { getAllRooms } from "@/lib/dal/rooms";

export async function GET() {
  const rooms = await getAllRooms();
  return Response.json(rooms);
}
