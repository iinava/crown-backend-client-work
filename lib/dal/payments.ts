import { sql } from "@/lib/db";

export interface Payment {
  id: number;
  resident_id: number | null;
  amount: string;          // rent amount (from resident's monthly_rate)
  due_date: string | null; // 5th of the payment month (null for dorm residents)
  fine_amount: string;     // accrued daily fine
  month: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  resident_name?: string;
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
}): Promise<{ data: Payment[]; total: number }> {
  const { residentId, month, paid, limit = 100, offset = 0, hostelId } = filters;

  const data = await sql`
    SELECT 
      p.*,
      r.name AS resident_name,
      r.move_in_date AS resident_move_in_date,
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
      (p.due_date IS NOT NULL AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date AND p.paid = false) AS is_expired
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
    ORDER BY p.paid ASC, r.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRow = await sql`
    SELECT COUNT(*)::int AS total FROM payments p
    JOIN residents r ON r.id = p.resident_id
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
  `;

  return { data: data as Payment[], total: countRow[0].total };
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
    SET paid = true, paid_at = NOW(), fine_amount = 0
    WHERE id = ${paymentId}
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
      fine_amount = COALESCE(${fields.fine_amount ?? null}::numeric, fine_amount),
      total_due   = COALESCE(${fields.amount ?? null}::numeric, amount)
                  + COALESCE(${fields.fine_amount ?? null}::numeric, fine_amount)
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
    SET fine_amount = GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)
                      * (SELECT value::numeric FROM settings WHERE key = 'daily_fine_amount')
    WHERE p.paid = false
      AND p.due_date IS NOT NULL
      AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date
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
    RETURNING id
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
  const result = await sql`
    INSERT INTO payments (resident_id, month, amount, due_date)
    SELECT
      r.id,
      ${month}::date,
      CASE
        WHEN rm.room_type = 'dormitory' THEN
          -- days from MAX(start_of_month, move_in_date) to end_of_month (inclusive)
          r.daily_rate * GREATEST(0,
            (DATE_TRUNC('month', ${month}::date) + INTERVAL '1 month - 1 day')::date
            - GREATEST(
                DATE_TRUNC('month', ${month}::date)::date,
                COALESCE(r.move_in_date, DATE_TRUNC('month', ${month}::date)::date)
              )
            + 1
          )
        ELSE
          r.monthly_rate
      END AS amount,
      CASE
        WHEN rm.room_type = 'dormitory' THEN NULL
        ELSE (${month}::date + INTERVAL '4 days')::date
      END AS due_date
    FROM residents r
    JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    JOIN beds b ON b.id = ba.bed_id
    JOIN rooms rm ON rm.id = b.room_id
    JOIN floors fl ON fl.id = rm.floor_id
    WHERE r.is_active = true
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
    ON CONFLICT (resident_id, month) DO NOTHING
    RETURNING id
  `;
  return result.length;
}

export async function updatePaymentNotes(paymentId: number, notes: string): Promise<void> {
  await sql`UPDATE payments SET notes = ${notes} WHERE id = ${paymentId}`;
}
