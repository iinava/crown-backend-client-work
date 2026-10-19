import { saveSetting } from "@/lib/dal/settings";
import { applyMonthlyRateToAll } from "@/lib/dal/residents";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { rate } = await request.json();
  const value = Number(rate);

  if (!Number.isFinite(value) || value <= 0) {
    return Response.json({ error: "Invalid rent amount" }, { status: 400 });
  }

  // Keep the default in sync so new residents get the same rate
  await saveSetting("default_monthly_rate", String(value));
  const updated = await applyMonthlyRateToAll(value);

  return Response.json({ success: true, updated });
}
