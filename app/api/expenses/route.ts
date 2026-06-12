import { getExpenses, createExpense } from "@/lib/dal/expenses";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month           = searchParams.get("month") ?? undefined;            // "YYYY-MM-DD"
  const hostelSlug      = searchParams.get("hostel") ?? undefined;
  const limit           = Number(searchParams.get("limit")  ?? 200);
  const offset          = Number(searchParams.get("offset") ?? 0);
  const excludeCategory = searchParams.get("exclude_category") ?? undefined; // e.g. "food"
  const categoryOnly    = searchParams.get("category") ?? undefined;         // e.g. "food"

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const result = await getExpenses({ month, hostelId, limit, offset, excludeCategory, categoryOnly });
  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, amount, category, date, notes, hostel } = body;

  if (!title || !amount || !date) {
    return Response.json({ error: "title, amount, date are required" }, { status: 400 });
  }

  let hostelId: number | undefined;
  if (hostel) {
    const hostelRow = await getHostelBySlug(hostel as string);
    hostelId = hostelRow?.id;
  }

  const expense = await createExpense({
    title: String(title),
    amount: Number(amount),
    category: String(category ?? "other"),
    date: String(date),
    notes: notes ? String(notes) : undefined,
    hostelId,
  });

  return Response.json(expense, { status: 201 });
}
