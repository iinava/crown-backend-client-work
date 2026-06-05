import { getPayments } from "@/lib/dal/payments";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

const PAGE_SIZE = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month      = searchParams.get("month") ?? undefined;
  const residentId = searchParams.get("resident_id") ? Number(searchParams.get("resident_id")) : undefined;
  const paid       = searchParams.get("paid") === "true" ? true : searchParams.get("paid") === "false" ? false : undefined;
  const search     = searchParams.get("search") || undefined;
  const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit      = Number(searchParams.get("limit") ?? PAGE_SIZE);
  const offset     = searchParams.has("offset")
    ? Number(searchParams.get("offset"))
    : (page - 1) * limit;
  const hostelSlug = searchParams.get("hostel") ?? undefined;

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const result = await getPayments({ month, residentId, paid, limit, offset, hostelId, search });
  return Response.json({ ...result, page, limit });
}
