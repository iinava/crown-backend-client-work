import { getResidents, createResident } from "@/lib/dal/residents";
import { getHostelBySlug } from "@/lib/dal/hostels";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search        = searchParams.get("search") ?? "";
  const limit         = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
  const offset        = Number(searchParams.get("offset") ?? "0");
  const activeOnly    = searchParams.get("active_only") === "true";
  const inactiveOnly  = searchParams.get("inactive_only") === "true";
  const blacklistOnly = searchParams.get("blacklist_only") === "true";
  const isStaff       = searchParams.has("is_staff") ? searchParams.get("is_staff") === "true" : undefined;
  const hostelSlug    = searchParams.get("hostel") ?? undefined;

  let hostelId: number | undefined;
  if (hostelSlug) {
    const hostel = await getHostelBySlug(hostelSlug);
    hostelId = hostel?.id;
  }

  const result = await getResidents({ search, limit, offset, activeOnly, inactiveOnly, blacklistOnly, isStaff, hostelId });
  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, phone, parent_phone, email, id_number, monthly_rate, daily_rate, move_in_date, notes, is_staff } = body;

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const resident = await createResident({
    name,
    phone,
    parent_phone,
    email,
    id_number,
    monthly_rate: Number(monthly_rate ?? 0),
    daily_rate: Number(daily_rate ?? 0),
    move_in_date,
    notes,
    is_staff,
  });

  return Response.json(resident, { status: 201 });
}
