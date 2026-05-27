import { sql } from "@/lib/db";

export interface Payment {
  id: number;
  resident_id: number;
  amount: string;          // rent amount (from resident's monthly_rate)
  due_date: string | null; // 5th of the payment month
  fine_amount: string;     // accrued daily fine
  month: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  resident_name?: string;
  hostel_name?: string;
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
      h.name AS hostel_name,
      (p.amount + p.fine_amount)::numeric                                                    AS total_due,
      GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)::int         AS days_overdue,
      (p.due_date IS NOT NULL AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date AND p.paid = false) AS is_expired
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    LEFT JOIN hostels h ON h.id = fl.hostel_id
    WHERE 
      (${residentId ?? null}::int IS NULL OR p.resident_id = ${residentId ?? null})
      AND (${month ?? null}::text IS NULL OR p.month = ${month ?? null}::date)
      AND (${paid ?? null}::boolean IS NULL OR p.paid = ${paid ?? null})
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
    ORDER BY p.paid ASC, r.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRow = await sql`
    SELECT COUNT(*)::int AS total FROM payments p
    JOIN residents r ON r.id = p.resident_id
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    WHERE 
      (${residentId ?? null}::int IS NULL OR p.resident_id = ${residentId ?? null})
      AND (${month ?? null}::text IS NULL OR p.month = ${month ?? null}::date)
      AND (${paid ?? null}::boolean IS NULL OR p.paid = ${paid ?? null})
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
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
      fine_amount = COALESCE(${fields.fine_amount ?? null}::numeric, fine_amount)
    WHERE id = ${paymentId}
    RETURNING *
  `;
  return (rows[0] as Payment) ?? null;
}

/**
 * Recalculate fines for ALL unpaid overdue payments.
 * Fine starts after the 5th of each month.
 * fine_amount = MAX(0, days_past_due_date) * daily_fine_amount setting
 */
export async function recalculateFines(): Promise<number> {
  const result = await sql`
    UPDATE payments p
    SET fine_amount = GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)
                      * (SELECT value::numeric FROM settings WHERE key = 'daily_fine_amount')
    WHERE p.paid = false
      AND p.due_date IS NOT NULL
      AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date
    RETURNING id
  `;
  return result.length;
}

/**
 * Generate monthly payment rows for all active residents with a bed.
 * Uses each resident's individual monthly_rate.
 * Due date = 5th of the payment month (fines start from 6th).
 * Idempotent — uses ON CONFLICT DO NOTHING.
 */
export async function generateMonthlyPayments(month: string, hostelId?: number): Promise<number> {
  const result = await sql`
    INSERT INTO payments (resident_id, month, amount, due_date)
    SELECT 
      r.id,
      ${month}::date,
      r.monthly_rate,
      (${month}::date + INTERVAL '4 days')::date
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
