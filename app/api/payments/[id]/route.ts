import { markPaymentPaid, updatePaymentNotes, updatePaymentFields } from "@/lib/dal/payments";
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

  // Edit amount and/or fine_amount
  if (body.amount !== undefined || body.fine_amount !== undefined) {
    const fields: { amount?: number; fine_amount?: number } = {};
    if (body.amount !== undefined) fields.amount = Number(body.amount);
    if (body.fine_amount !== undefined) fields.fine_amount = Number(body.fine_amount);
    const updated = await updatePaymentFields(Number(id), fields);
    if (!updated) return Response.json({ error: "Payment not found" }, { status: 404 });
    return Response.json(updated);
  }

  if (body.notes !== undefined) {
    await updatePaymentNotes(Number(id), body.notes);
    return Response.json({ success: true });
  }

  return Response.json({ error: "No valid action" }, { status: 400 });
}
