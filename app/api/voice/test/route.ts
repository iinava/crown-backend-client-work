import { sendReminder } from "@/lib/sms";
import { NextRequest } from "next/server";

/**
 * Test endpoint to make a single voice call.
 * Usage: GET /api/voice/test?phone=7025032459
 *
 * ⚠️ DELETE THIS FILE before going to production!
 */
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return Response.json({ error: "Add ?phone=7025032459 to the URL" }, { status: 400 });
  }

  console.log(`[TEST] Calling ${phone}...`);

  const result = await sendReminder(phone, {
    residentName: "Test Resident",
    amount: "3000",
    month: "May 2026",
    daysOverdue: 15,
    fineAmount: "750",
    totalDue: 3750,
  });

  console.log(`[TEST] Result:`, result);
  return Response.json(result);
}
