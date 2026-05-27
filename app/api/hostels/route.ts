import { getAllHostels } from "@/lib/dal/hostels";

export async function GET() {
  const hostels = await getAllHostels();
  return Response.json(hostels);
}
