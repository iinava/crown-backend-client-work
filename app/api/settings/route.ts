import { getSettings, saveSetting } from "@/lib/dal/settings";
import { NextRequest } from "next/server";

export async function GET() {
  const settings = await getSettings();
  return Response.json(settings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, value } = body;

  const allowed = ["default_monthly_rate", "grace_period_days", "daily_fine_amount"];
  if (!allowed.includes(key)) {
    return Response.json({ error: "Unknown setting key" }, { status: 400 });
  }

  await saveSetting(key, String(value));
  return Response.json({ success: true, key, value });
}
