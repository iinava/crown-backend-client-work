import { sql } from "@/lib/db";

export interface Payment {
  id: number;
  resident_id: number;
  amount: string;          // base rent (from settings at generation time)
  due_date: string | null; // month + grace_period_days
  fine_amount: string;     // accrued daily fine
  month: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  resident_name?: string;
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
}): Promise<{ data: Payment[]; total: number }> {
  const { residentId, month, paid, limit = 100, offset = 0 } = filters;

  const data = await sql`
    SELECT 
      p.*,
      r.name AS resident_name,
      (p.amount + p.fine_amount)::numeric                                                    AS total_due,
      GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)::int         AS days_overdue,
      (p.due_date IS NOT NULL AND (NOW() AT TIME ZONE 'Asia/Kolkata')::date > p.due_date::date AND p.paid = false) AS is_expired
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    WHERE 
      (${residentId ?? null}::int IS NULL OR p.resident_id = ${residentId ?? null})
      AND (${month ?? null}::text IS NULL OR p.month = ${month ?? null}::date)
      AND (${paid ?? null}::boolean IS NULL OR p.paid = ${paid ?? null})
    ORDER BY p.paid ASC, r.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRow = await sql`
    SELECT COUNT(*)::int AS total FROM payments p
    WHERE 
      (${residentId ?? null}::int IS NULL OR p.resident_id = ${residentId ?? null})
      AND (${month ?? null}::text IS NULL OR p.month = ${month ?? null}::date)
      AND (${paid ?? null}::boolean IS NULL OR p.paid = ${paid ?? null})
  `;

  return { data: data as Payment[], total: countRow[0].total };
}

export async function getUnpaidThisMonth(): Promise<Payment[]> {
  const rows = await sql`
    SELECT p.*, r.name AS resident_name,
      (p.amount + p.fine_amount)::numeric AS total_due,
      GREATEST(0, (NOW() AT TIME ZONE 'Asia/Kolkata')::date - p.due_date::date)::int AS days_overdue
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    WHERE p.month = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')
      AND p.paid = false
      AND r.is_active = true
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
 * Recalculate fines for ALL unpaid overdue payments.
 * fine_amount = MAX(0, days_past_due) * daily_fine_amount setting
 * Skips already-paid payments.
 * Returns number of rows updated.
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
 * Uses global default_monthly_rate from settings.
 * Sets due_date = month + grace_period_days.
 * Idempotent — uses ON CONFLICT DO NOTHING.
 */
export async function generateMonthlyPayments(month: string): Promise<number> {
  const result = await sql`
    INSERT INTO payments (resident_id, month, amount, due_date)
    SELECT 
      r.id,
      ${month}::date,
      (SELECT value::numeric FROM settings WHERE key = 'default_monthly_rate'),
      ${month}::date + (SELECT value::int FROM settings WHERE key = 'grace_period_days') * INTERVAL '1 day'
    FROM residents r
    JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    WHERE r.is_active = true
    ON CONFLICT (resident_id, month) DO NOTHING
    RETURNING id
  `;
  return result.length;
}

export async function updatePaymentNotes(paymentId: number, notes: string): Promise<void> {
  await sql`UPDATE payments SET notes = ${notes} WHERE id = ${paymentId}`;
}
