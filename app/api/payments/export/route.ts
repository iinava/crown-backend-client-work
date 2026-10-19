import { getPaymentsForExport } from "@/lib/dal/payments";
import { getExpensesForExport } from "@/lib/dal/expenses";
import { getResidentsForExport } from "@/lib/dal/residents";
import { getAllHostels } from "@/lib/dal/hostels";
import { buildMonthlyReport } from "@/lib/export/monthly-report-xlsx";
import { NextRequest } from "next/server";

/** Full monthly report for all hostels: payments, expenses, residents and totals. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? "";  // "YYYY-MM-01"

  if (!/^\d{4}-\d{2}-01$/.test(month)) {
    return Response.json({ error: "month must be YYYY-MM-01" }, { status: 400 });
  }

  const [hostels, payments, expenses, residents] = await Promise.all([
    getAllHostels(),
    getPaymentsForExport(month),
    getExpensesForExport(month),
    getResidentsForExport(),
  ]);

  const file = await buildMonthlyReport({
    month: month.slice(0, 7),
    hostels: hostels.map((h) => ({ id: h.id, name: h.name })),
    payments,
    expenses,
    residents,
  });

  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="crown-report-${month.slice(0, 7)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
