import { sql } from "@/lib/db";
import { getConfirmedBookingForResidentMonth, markBookingConverted } from "@/lib/dal/bookings";

export interface Payment {
  id: number;
  resident_id: number | null;
  amount: string;          // rent amount (from resident's monthly_rate)
  due_date: string | null; // 5th of the payment month (null for dorm residents)
  fine_amount: string;     // accrued daily fine
  fine_paid: string;       // fine captured at the moment of payment
  month: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  booking_id: number | null;  // set for booking advance payments
  is_advance: boolean;        // true when this row represents a booking advance
  created_at: string;
  resident_name?: string;
  resident_phone?: string | null;
  resident_bed_no?: string | null;
  hostel_name?: string;
  resident_move_in_date?: string | null;
  // Computed helpers
  total_due?: number;      // amount + fine_amount
  days_overdue?: number;
  is_expired?: boolean;    // past due_date and unpaid
}

export async function getPayments(filters: {
  residentId?: number;
  month?: string;
  paid?: boolean;
  limit?: number;
  offset?: number;
  hostelId?: number;
  search?: string;
}): Promise<{
  data: Payment[];
  total: number;
  stats: {
    count_total: number;
    count_paid: number;
    count_unpaid: number;
    count_overdue: number;
    sum_collected: number;
    sum_fines_collected: number;
    sum_pending: number;
    sum_fines: number;
  };
}> {
  const { residentId, month, paid, limit = 100, offset = 0, hostelId, search } = filters;
  const searchPattern = search ? `%${search}%` : null;

  const data = await sql`
    SELECT 
      p.*,
      r.name AS resident_name,
      r.phone AS resident_phone,
      r.move_in_date AS resident_move_in_date,
      b.number AS resident_bed_no,
      -- Hostel name: prefer active assignment, fall back to most recent historical one
      COALESCE(
        h_active.name,
        (
          SELECT h2.name FROM bed_assignments ba2
          JOIN beds b2 ON b2.id = ba2.bed_id
          JOIN rooms rm2 ON rm2.id = b2.room_id
          JOIN floors fl2 ON fl2.id = rm2.floor_id
          JOIN hostels h2 ON h2.id = fl2.hostel_id
          WHERE ba2.resident_id = r.id
          ORDER BY ba2.vacated_at DESC NULLS FIRST
          LIMIT 1
        )
      ) AS hostel_name,
      (p.amount + p.fine_amount)::numeric                                                    AS total_due,
      GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)::int         AS days_overdue,
      (p.due_date IS NOT NULL AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date AND p.paid = false) AS is_expired,
      (p.booking_id IS NOT NULL)                                                             AS is_advance
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    -- Active bed (may be NULL for checked-out residents)
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    LEFT JOIN hostels h_active ON h_active.id = fl.hostel_id
    WHERE 
      (${residentId ?? null}::int IS NULL OR p.resident_id = ${residentId ?? null})
      AND (${month ?? null}::text IS NULL OR p.month = ${month ?? null}::date)
      AND (${paid ?? null}::boolean IS NULL OR p.paid = ${paid ?? null})
      AND (
        ${hostelId ?? null}::int IS NULL
        OR EXISTS (
          SELECT 1 FROM bed_assignments ba2
          JOIN beds b2 ON b2.id = ba2.bed_id
          JOIN rooms rm2 ON rm2.id = b2.room_id
          JOIN floors fl2 ON fl2.id = rm2.floor_id
          WHERE ba2.resident_id = r.id
            AND fl2.hostel_id = ${hostelId ?? null}
        )
      )
      AND (
        ${searchPattern}::text IS NULL
        OR r.name    ILIKE ${searchPattern}
        OR r.phone   ILIKE ${searchPattern}
        OR b.number  ILIKE ${searchPattern}
      )
    ORDER BY p.paid ASC, r.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const statsRow = await sql`
    SELECT
      COUNT(*)::int                                                                              AS count_total,
      COUNT(*) FILTER (WHERE p.paid = true)::int                                                AS count_paid,
      COUNT(*) FILTER (WHERE p.paid = false)::int                                               AS count_unpaid,
      COUNT(*) FILTER (
        WHERE p.paid = false
          AND p.due_date IS NOT NULL
          AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date
      )::int                                                                                     AS count_overdue,
      COALESCE(SUM(p.amount + p.fine_paid) FILTER (WHERE p.paid = true),  0)::numeric           AS sum_collected,
      COALESCE(SUM(p.fine_paid)            FILTER (WHERE p.paid = true),  0)::numeric           AS sum_fines_collected,
      COALESCE(SUM(p.amount + p.fine_amount) FILTER (WHERE p.paid = false), 0)::numeric         AS sum_pending,
      COALESCE(SUM(p.fine_amount) FILTER (WHERE p.paid = false), 0)::numeric                    AS sum_fines
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    WHERE
      (${residentId ?? null}::int IS NULL OR p.resident_id = ${residentId ?? null})
      AND (${month ?? null}::text IS NULL OR p.month = ${month ?? null}::date)
      AND (${paid ?? null}::boolean IS NULL OR p.paid = ${paid ?? null})
      AND (
        ${hostelId ?? null}::int IS NULL
        OR EXISTS (
          SELECT 1 FROM bed_assignments ba2
          JOIN beds b2 ON b2.id = ba2.bed_id
          JOIN rooms rm2 ON rm2.id = b2.room_id
          JOIN floors fl2 ON fl2.id = rm2.floor_id
          WHERE ba2.resident_id = r.id
            AND fl2.hostel_id = ${hostelId ?? null}
        )
      )
      AND (
        ${searchPattern}::text IS NULL
        OR r.name    ILIKE ${searchPattern}
        OR r.phone   ILIKE ${searchPattern}
        OR b.number  ILIKE ${searchPattern}
      )
  `;

  const s = statsRow[0];
  return {
    data: data as Payment[],
    total: Number(s.count_total),
    stats: {
      count_total:        Number(s.count_total),
      count_paid:         Number(s.count_paid),
      count_unpaid:       Number(s.count_unpaid),
      count_overdue:      Number(s.count_overdue),
      sum_collected:      Number(s.sum_collected),
      sum_fines_collected: Number(s.sum_fines_collected),
      sum_pending:        Number(s.sum_pending),
      sum_fines:          Number(s.sum_fines),
    },
  };
}

export async function getUnpaidThisMonth(hostelId?: number): Promise<Payment[]> {
  const rows = await sql`
    SELECT p.*, r.name AS resident_name,
      (p.amount + p.fine_amount)::numeric AS total_due,
      GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)::int AS days_overdue
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    WHERE p.month = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')
      AND p.paid = false
      AND r.is_active = true
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
    ORDER BY r.name
  `;
  return rows as Payment[];
}

export async function markPaymentPaid(paymentId: number): Promise<Payment | null> {
  const rows = await sql`
    UPDATE payments 
    SET paid = true, paid_at = NOW(), fine_paid = fine_amount, fine_amount = 0
    WHERE id = ${paymentId}
    RETURNING *
  `;
  return (rows[0] as Payment) ?? null;
}

export async function undoPaymentPaid(paymentId: number): Promise<Payment | null> {
  const rows = await sql`
    UPDATE payments p
    SET 
      paid = false, 
      paid_at = NULL,
      fine_paid = 0,
      fine_amount = CASE
        WHEN p.due_date IS NULL THEN 0
        ELSE GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date) 
             * COALESCE((SELECT value::numeric FROM settings WHERE key = 'daily_fine_amount'), 0)
      END
    WHERE id = ${paymentId}
      AND paid = true
    RETURNING *
  `;
  return (rows[0] as Payment) ?? null;
}


/**
 * Update editable fields on a payment record (amount and/or fine).
 */
export async function updatePaymentFields(
  paymentId: number,
  fields: { amount?: number; fine_amount?: number }
): Promise<Payment | null> {
  const rows = await sql`
    UPDATE payments SET
      amount      = COALESCE(${fields.amount ?? null}::numeric, amount),
      fine_amount = COALESCE(${fields.fine_amount ?? null}::numeric, fine_amount)
    WHERE id = ${paymentId}
      AND paid = false
    RETURNING *
  `;
  return (rows[0] as Payment) ?? null;
}

/**
 * Recalculate fines for ALL unpaid overdue payments.
 * Fine starts after the 5th of each month.
 * fine_amount = MAX(0, days_past_due_date) * daily_fine_amount setting
 * Dormitory residents never accrue fines.
 */
export async function recalculateFines(): Promise<number> {
  const result = await sql`
    UPDATE payments p
    SET fine_amount = GREATEST(0, COALESCE(r.move_out_date, (NOW() AT TIME ZONE 'Asia/Kolkata')::date) - p.due_date::date)
                      * (SELECT value::numeric FROM settings WHERE key = 'daily_fine_amount')
    FROM residents r
    WHERE p.resident_id = r.id
      AND p.paid = false
      AND p.due_date IS NOT NULL
      AND COALESCE(r.move_out_date, (NOW() AT TIME ZONE 'Asia/Kolkata')::date) > p.due_date::date
      -- Skip dormitory residents
      AND NOT EXISTS (
        SELECT 1
        FROM bed_assignments ba
        JOIN beds b ON b.id = ba.bed_id
        JOIN rooms rm ON rm.id = b.room_id
        WHERE ba.resident_id = p.resident_id
          AND ba.vacated_at IS NULL
          AND rm.room_type = 'dormitory'
      )
    RETURNING p.id
  `;
  return result.length;
}

/**
 * Generate monthly payment rows for all active residents with a bed.
 *
 * Normal rooms:   amount = monthly_rate, due_date = 5th of month
 * Dormitory rooms: amount = daily_rate × days stayed in that billing month,
 *                  due_date = NULL (pay on checkout, no fines)
 *
 * Idempotent — uses ON CONFLICT DO NOTHING.
 */
export async function generateMonthlyPayments(month: string, hostelId?: number): Promise<number> {
  // "YYYY-MM-DD" → "YYYY-MM" for booking lookup
  const monthKey = month.slice(0, 7);

  // 1. Find all eligible residents (active, has a bed, non-staff)
  const eligible = await sql`
    SELECT
      r.id         AS resident_id,
      rm.room_type AS room_type,
      r.daily_rate,
      r.monthly_rate,
      r.move_in_date,
      CASE
        WHEN rm.room_type = 'dormitory' THEN NULL
        ELSE (${month}::date + INTERVAL '4 days')::date
      END AS due_date,
      CASE
        WHEN rm.room_type = 'dormitory' THEN
          r.daily_rate * GREATEST(0,
            (DATE_TRUNC('month', ${month}::date) + INTERVAL '1 month - 1 day')::date
            - GREATEST(
                DATE_TRUNC('month', ${month}::date)::date,
                COALESCE(r.move_in_date, DATE_TRUNC('month', ${month}::date)::date)
              )
            + 1
          )
        ELSE r.monthly_rate
      END AS base_amount
    FROM residents r
    JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    JOIN beds b ON b.id = ba.bed_id
    JOIN rooms rm ON rm.id = b.room_id
    JOIN floors fl ON fl.id = rm.floor_id
    WHERE r.is_active = true
      AND r.is_staff = false
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
  `;

  // 2. Pre-fetch ALL confirmed bookings for this month in ONE query — avoids N+1
  const bookingRows = await sql`
    SELECT id, resident_id, advance_amount
    FROM bookings
    WHERE for_month = ${monthKey} AND status = 'confirmed'
  `;
  const bookingMap = new Map(
    (bookingRows as { id: number; resident_id: number; advance_amount: string }[])
      .map((b) => [b.resident_id, b])
  );

  const eligibleRows = eligible as {
    resident_id: number;
    room_type: string;
    base_amount: string;
    due_date: string | null;
  }[];

  let generated = 0;
  const CHUNK_SIZE = 50;

  for (let i = 0; i < eligibleRows.length; i += CHUNK_SIZE) {
    const chunk = eligibleRows.slice(i, i + CHUNK_SIZE);
    
    const promises = chunk.map(async (row) => {
      const booking = bookingMap.get(row.resident_id) ?? null;
      const advance = booking ? Number(booking.advance_amount) : 0;
      const finalAmount = Math.max(0, Number(row.base_amount) - advance);

      const result = await sql`
        INSERT INTO payments (resident_id, month, amount, due_date)
        VALUES (
          ${row.resident_id},
          ${month}::date,
          ${finalAmount},
          ${row.due_date ?? null}
        )
        ON CONFLICT (resident_id, month) DO NOTHING
        RETURNING id
      `;

      if (result.length > 0) {
        if (booking) await markBookingConverted(booking.id);
        return 1;
      }
      return 0;
    });

    const results = await Promise.all(promises);
    generated += results.reduce<number>((sum, val) => sum + val, 0);
  }

  return generated;
}

export async function updatePaymentNotes(paymentId: number, notes: string): Promise<void> {
  await sql`UPDATE payments SET notes = ${notes} WHERE id = ${paymentId}`;
}

/**
 * Creates an already-paid payment row for a booking advance.
 * month is derived from advancePaidAt so the cash shows in the correct month's collected total.
 */
export async function createAdvancePayment({
  bookingId,
  residentId,
  advanceAmount,
  advancePaidAt,
  forMonth,
}: {
  bookingId: number;
  residentId: number;
  advanceAmount: number;
  advancePaidAt: string;  // "YYYY-MM-DD" — the date cash was received
  forMonth: string;       // "YYYY-MM" — the month being booked, used for the note
}): Promise<void> {
  // Use the month the advance was actually paid (not the booked month)
  const paidMonth = advancePaidAt.slice(0, 7);                    // "YYYY-MM"
  const paidMonthDate = `${paidMonth}-01`;                       // "YYYY-MM-01" for the date column
  const [y, m] = forMonth.split("-").map(Number);
  const forMonthLabel = new Date(y, m - 1, 1)
    .toLocaleString("en-IN", { month: "long", year: "numeric" }); // e.g. "July 2026"

  await sql`
    INSERT INTO payments
      (resident_id, month, amount, due_date, paid, paid_at, fine_amount, fine_paid, notes, booking_id)
    VALUES (
      ${residentId},
      ${paidMonthDate}::date,
      ${advanceAmount},
      NULL,           -- no due date, no fines on advance payments
      true,
      ${advancePaidAt}::date,
      0,
      0,
      ${`Booking advance for ${forMonthLabel}`},
      ${bookingId}
    )
    ON CONFLICT (resident_id, month) DO NOTHING
  `;
}

/**
 * Deletes the advance payment row linked to a booking (called when booking is deleted).
 * Only deletes if the payment hasn't been manually edited (i.e. still marked paid via booking).
 */
export async function deleteAdvancePaymentForBooking(bookingId: number): Promise<void> {
  await sql`DELETE FROM payments WHERE booking_id = ${bookingId}`;
}

/**
 * Creates a manual advance payment row for an existing resident.
 */
export async function createManualAdvancePayment({
  residentId,
  amount,
  month,
  notes,
}: {
  residentId: number;
  amount: number;
  month: string; // "YYYY-MM-DD"
  notes?: string;
}): Promise<{ id: number } | null> {
  const result = await sql`
    INSERT INTO payments (resident_id, month, amount, due_date, paid, paid_at, fine_amount, fine_paid, notes)
    VALUES (
      ${residentId},
      ${month}::date,
      ${amount},
      NULL,
      true,
      NOW(),
      0,
      0,
      ${notes || null}
    )
    ON CONFLICT (resident_id, month) DO NOTHING
    RETURNING id
  `;
  return result[0] ? (result[0] as { id: number }) : null;
}
