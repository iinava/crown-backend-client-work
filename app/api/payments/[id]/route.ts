import { markPaymentPaid, updatePaymentNotes } from "@/lib/dal/payments";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.paid === true) {
    const updated = await markPaymentPaid(Number(id));
    if (!updated) return Response.json({ error: "Payment not found" }, { status: 404 });
    return Response.json(updated);
  }

  if (body.notes !== undefined) {
    await updatePaymentNotes(Number(id), body.notes);
    return Response.json({ success: true });
  }

  return Response.json({ error: "No valid action" }, { status: 400 });
}
