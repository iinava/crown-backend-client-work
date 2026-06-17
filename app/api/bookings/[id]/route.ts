import { deleteBooking } from "@/lib/dal/bookings";
import { deleteAdvancePaymentForBooking } from "@/lib/dal/payments";
import { NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookingId = Number(id);
  // Delete the advance payment first (no FK cascade), then the booking
  await deleteAdvancePaymentForBooking(bookingId);
  await deleteBooking(bookingId);
  return Response.json({ success: true });
}
