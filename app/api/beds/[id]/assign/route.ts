import { assignBed, vacateBed, getBedById } from "@/lib/dal/beds";
import { getResidentById } from "@/lib/dal/residents";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bedId = Number(id);
  const body = await request.json();
  const { resident_id } = body;

  if (!resident_id) {
    return Response.json({ error: "resident_id is required" }, { status: 400 });
  }

  const bed = await getBedById(bedId);
  if (!bed) return Response.json({ error: "Bed not found" }, { status: 404 });

  // Block assignment if resident is blacklisted
  const resident = await getResidentById(Number(resident_id));
  if (resident?.is_blacklisted) {
    return Response.json(
      { error: "This resident is blacklisted and cannot be assigned to a bed." },
      { status: 409 }
    );
  }

  await assignBed(bedId, Number(resident_id));
  return Response.json({ success: true, bed_id: bedId, resident_id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bedId = Number(id);
  const bed = await getBedById(bedId);
  if (!bed) return Response.json({ error: "Bed not found" }, { status: 404 });
  await vacateBed(bedId);
  return Response.json({ success: true });
}
