import { getBookings, createBooking } from "@/lib/dal/bookings";
import { createAdvancePayment } from "@/lib/dal/payments";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const for_month  = searchParams.get("for_month")  ?? undefined;
  const status     = searchParams.get("status")      ?? undefined;
  const hostelSlug = searchParams.get("hostel")      ?? undefined;

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const data = await getBookings({ for_month, hostelId, status });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resident_id, bed_id, for_month, advance_amount, advance_paid_at, advance_method, notes } = body;

  if (!resident_id || !bed_id || !for_month) {
    return Response.json({ error: "resident_id, bed_id and for_month are required" }, { status: 400 });
  }
  const amt = Number(advance_amount ?? 0);
  if (isNaN(amt) || amt < 0) {
    return Response.json({ error: "advance_amount must be a non-negative number" }, { status: 400 });
  }
  // advance_paid_at required when an advance is given
  const paidAt: string = advance_paid_at || new Date().toISOString().slice(0, 10);

  try {
    // 1. Create booking record
    const booking = await createBooking({
      resident_id: Number(resident_id),
      bed_id: Number(bed_id),
      for_month,
      advance_amount: amt,
      advance_paid_at: paidAt,
      advance_method: advance_method ?? "cash",
      notes: notes ?? undefined,
    });

    // 2. If advance > 0, immediately log it as a paid payment in the advance-received month
    if (amt > 0) {
      await createAdvancePayment({
        bookingId:     booking.id,
        residentId:    Number(resident_id),
        advanceAmount: amt,
        advancePaidAt: paidAt,
        forMonth:      for_month,
      });
    }

    return Response.json(booking, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return Response.json({ error: "A booking already exists for this resident in that month" }, { status: 409 });
    }
    throw err;
  }
}
