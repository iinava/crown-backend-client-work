import { sql } from "@/lib/db";

/** A resident with an overdue unpaid payment and a phone number */
export interface OverdueResident {
  resident_id: number;
  resident_name: string;
  phone: string;
  payment_id: number;
  amount: string;
  fine_amount: string;
  month: string;
  days_overdue: number;
  total_due: number;
}

/**
 * Get all residents who have overdue unpaid payments AND a phone number.
 * Returns one row per overdue payment.
 */
export async function getOverdueResidents(hostelId?: number): Promise<OverdueResident[]> {
  const rows = await sql`
    SELECT
      r.id            AS resident_id,
      r.name          AS resident_name,
      r.phone,
      p.id            AS payment_id,
      p.amount,
      p.fine_amount,
      p.month,
      GREATEST(EXTRACT(DAY FROM NOW() - p.due_date)::int, 0) AS days_overdue,
      (p.amount::numeric + p.fine_amount::numeric)::numeric   AS total_due
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    LEFT JOIN bed_assignments ba ON ba.resident_id = r.id AND ba.vacated_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    LEFT JOIN rooms rm ON rm.id = b.room_id
    LEFT JOIN floors fl ON fl.id = rm.floor_id
    WHERE p.paid = false
      AND p.due_date < NOW()
      AND r.phone IS NOT NULL
      AND r.phone != ''
      AND r.is_active = true
      AND (${hostelId ?? null}::int IS NULL OR fl.hostel_id = ${hostelId ?? null})
    ORDER BY days_overdue DESC
  `;
  return rows as OverdueResident[];
}

/**
 * Check if a resident was already notified today on the given channel.
 * Uses the unique index (resident_id, channel, sent_date) for fast lookup.
 */
export async function wasNotifiedToday(
  residentId: number,
  channel: string
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM notification_log
    WHERE resident_id = ${residentId}
      AND channel = ${channel}
      AND sent_date = CURRENT_DATE
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Log a notification attempt (success or failure).
 */
export async function logNotification(entry: {
  residentId: number;
  paymentId: number;
  channel: string;
  phone: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}): Promise<void> {
  await sql`
    INSERT INTO notification_log
      (resident_id, payment_id, channel, phone, status, message_id, error, sent_date, sent_at)
    VALUES
      (${entry.residentId}, ${entry.paymentId}, ${entry.channel}, ${entry.phone},
       ${entry.status}, ${entry.messageId ?? null}, ${entry.error ?? null},
       CURRENT_DATE, NOW())
    ON CONFLICT (resident_id, channel, sent_date) DO UPDATE
      SET status = EXCLUDED.status,
          message_id = EXCLUDED.message_id,
          error = EXCLUDED.error,
          sent_at = NOW()
  `;
}

/** Notification log entry returned by getNotificationHistory */
export interface NotificationEntry {
  id: number;
  resident_name: string;
  phone: string;
  channel: string;
  status: string;
  error: string | null;
  sent_date: string;
  sent_at: string;
}

/** Get notification history with optional date filters */
export async function getNotificationHistory(filters: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: NotificationEntry[]; total: number; todayStats: { sent: number; failed: number; total: number } }> {
  const { dateFrom, dateTo, limit = 50, offset = 0 } = filters;

  const data = await sql`
    SELECT
      n.id, r.name AS resident_name, n.phone, n.channel,
      n.status, n.error, n.sent_date, n.sent_at
    FROM notification_log n
    JOIN residents r ON r.id = n.resident_id
    WHERE (${dateFrom ?? null}::date IS NULL OR n.sent_date >= ${dateFrom ?? null}::date)
      AND (${dateTo ?? null}::date IS NULL   OR n.sent_date <= ${dateTo ?? null}::date)
    ORDER BY n.sent_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await sql`
    SELECT COUNT(*)::int AS total FROM notification_log n
    WHERE (${dateFrom ?? null}::date IS NULL OR n.sent_date >= ${dateFrom ?? null}::date)
      AND (${dateTo ?? null}::date IS NULL   OR n.sent_date <= ${dateTo ?? null}::date)
  `;

  const todayResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'sent')::int   AS sent,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*)::int AS total
    FROM notification_log
    WHERE sent_date = CURRENT_DATE
  `;

  return {
    data: data as NotificationEntry[],
    total: (countResult[0] as { total: number }).total,
    todayStats: todayResult[0] as { sent: number; failed: number; total: number },
  };
}
