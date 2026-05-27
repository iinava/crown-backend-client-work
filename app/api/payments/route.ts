import { getPayments } from "@/lib/dal/payments";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month      = searchParams.get("month") ?? undefined;
  const residentId = searchParams.get("resident_id") ? Number(searchParams.get("resident_id")) : undefined;
  const paid       = searchParams.get("paid") === "true" ? true : searchParams.get("paid") === "false" ? false : undefined;
  const limit      = Number(searchParams.get("limit") ?? 100);
  const offset     = Number(searchParams.get("offset") ?? 0);
  const hostelSlug = searchParams.get("hostel") ?? undefined;

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const result = await getPayments({ month, residentId, paid, limit, offset, hostelId });
  return Response.json(result);
}
