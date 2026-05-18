import { getResidents, createResident } from "@/lib/dal/residents";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
  const offset = Number(searchParams.get("offset") ?? "0");
  const activeOnly = searchParams.get("active_only") === "true";

  const result = await getResidents({ search, limit, offset, activeOnly });
  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, phone, email, id_number, monthly_rate, move_in_date, notes } = body;

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const resident = await createResident({
    name,
    phone,
    email,
    id_number,
    monthly_rate: Number(monthly_rate ?? 0),
    move_in_date,
    notes,
  });

  return Response.json(resident, { status: 201 });
}
