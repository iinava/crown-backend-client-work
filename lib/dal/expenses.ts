import { sql } from "@/lib/db";

export interface Expense {
  id: number;
  title: string;
  amount: string;
  category: string;
  date: string;
  notes: string | null;
  hostel_id: number | null;
  created_at: string;
}

export const EXPENSE_CATEGORIES = [
  "maintenance",
  "utilities",
  "salaries",
  "groceries",
  "repairs",
  "cleaning",
  "bills",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getExpenses(filters: {
  month?: string;       // "YYYY-MM-DD" (first of month)
  hostelId?: number;
  limit?: number;
  offset?: number;
}): Promise<{ data: Expense[]; total: number }> {
  const { month, hostelId, limit = 100, offset = 0 } = filters;

  const data = await sql`
    SELECT *
    FROM expenses
    WHERE
      (${month ?? null}::text IS NULL
        OR DATE_TRUNC('month', date) = DATE_TRUNC('month', ${month ?? null}::date))
      AND (${hostelId ?? null}::int IS NULL OR hostel_id = ${hostelId ?? null})
    ORDER BY date DESC, id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRow = await sql`
    SELECT COUNT(*)::int AS total
    FROM expenses
    WHERE
      (${month ?? null}::text IS NULL
        OR DATE_TRUNC('month', date) = DATE_TRUNC('month', ${month ?? null}::date))
      AND (${hostelId ?? null}::int IS NULL OR hostel_id = ${hostelId ?? null})
  `;

  return { data: data as Expense[], total: countRow[0].total };
}

/** Per-category breakdown + grand total for the selected month/hostel. */
export async function getExpenseSummary(filters: {
  month?: string;
  hostelId?: number;
}): Promise<{ category: string; total: number }[]> {
  const { month, hostelId } = filters;

  const rows = await sql`
    SELECT category, COALESCE(SUM(amount), 0)::numeric AS total
    FROM expenses
    WHERE
      (${month ?? null}::text IS NULL
        OR DATE_TRUNC('month', date) = DATE_TRUNC('month', ${month ?? null}::date))
      AND (${hostelId ?? null}::int IS NULL OR hostel_id = ${hostelId ?? null})
    GROUP BY category
    ORDER BY total DESC
  `;

  return rows as { category: string; total: number }[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createExpense(fields: {
  title: string;
  amount: number;
  category: string;
  date: string;       // "YYYY-MM-DD"
  notes?: string;
  hostelId?: number;
}): Promise<Expense> {
  const rows = await sql`
    INSERT INTO expenses (title, amount, category, date, notes, hostel_id)
    VALUES (
      ${fields.title},
      ${fields.amount},
      ${fields.category},
      ${fields.date}::date,
      ${fields.notes ?? null},
      ${fields.hostelId ?? null}
    )
    RETURNING *
  `;
  return rows[0] as Expense;
}

export async function updateExpense(
  id: number,
  fields: {
    title?: string;
    amount?: number;
    category?: string;
    date?: string;
    notes?: string | null;
  }
): Promise<Expense | null> {
  const rows = await sql`
    UPDATE expenses SET
      title    = COALESCE(${fields.title    ?? null},    title),
      amount   = COALESCE(${fields.amount   ?? null}::numeric, amount),
      category = COALESCE(${fields.category ?? null},    category),
      date     = COALESCE(${fields.date     ?? null}::date, date),
      notes    = CASE WHEN ${fields.notes !== undefined}
                      THEN ${fields.notes ?? null}
                      ELSE notes
                 END
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Expense) ?? null;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const rows = await sql`DELETE FROM expenses WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
