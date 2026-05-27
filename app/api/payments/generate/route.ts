import { generateMonthlyPayments } from "@/lib/dal/payments";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const month = body.month ?? new Date().toISOString().slice(0, 7) + "-01";
  const hostelSlug = body.hostel ?? undefined;

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const generated = await generateMonthlyPayments(month, hostelId);
  return Response.json({ generated, month, hostel: hostelSlug ?? "all" });
}
