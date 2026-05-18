import { getRoomById, getRoomWithBeds, setRoomFull } from "@/lib/dal/rooms";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [room, beds] = await Promise.all([
    getRoomById(Number(id)),
    getRoomWithBeds(Number(id)),
  ]);

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  return Response.json({ ...room, beds });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { is_full } = body;

  if (typeof is_full !== "boolean") {
    return Response.json({ error: "is_full (boolean) required" }, { status: 400 });
  }

  await setRoomFull(Number(id), is_full);
  const room = await getRoomById(Number(id));
  return Response.json(room);
}
