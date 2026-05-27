import { getAllRooms } from "@/lib/dal/rooms";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hostelSlug = searchParams.get("hostel") ?? undefined;

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const rooms = await getAllRooms(hostelId);
  return Response.json(rooms);
}
