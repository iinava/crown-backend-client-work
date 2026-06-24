import { createManualAdvancePayment } from "@/lib/dal/payments";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { residentId, month, amount, notes } = body;

    if (!residentId || !month || amount === undefined || amount === null) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await createManualAdvancePayment({
      residentId: Number(residentId),
      month,
      amount: Number(amount),
      notes,
    });

    if (!result) {
      return Response.json(
        { error: "A payment record for this month already exists for this resident." },
        { status: 409 }
      );
    }

    return Response.json({ success: true, id: result.id });
  } catch (err: unknown) {
    console.error("Advance payment error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
