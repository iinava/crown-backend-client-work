import { generateMonthlyPayments } from "@/lib/dal/payments";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const month = body.month ?? new Date().toISOString().slice(0, 7) + "-01";
  const generated = await generateMonthlyPayments(month);
  return Response.json({ generated, month });
}
