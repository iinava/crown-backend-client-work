import { getPayments } from "@/lib/dal/payments";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month      = searchParams.get("month") ?? undefined;
  const residentId = searchParams.get("resident_id") ? Number(searchParams.get("resident_id")) : undefined;
  const paid       = searchParams.get("paid") === "true" ? true : searchParams.get("paid") === "false" ? false : undefined;
  const limit      = Number(searchParams.get("limit") ?? 100);
  const offset     = Number(searchParams.get("offset") ?? 0);

  const result = await getPayments({ month, residentId, paid, limit, offset });
  return Response.json(result);
}
