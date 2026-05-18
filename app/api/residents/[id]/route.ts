import { getResidentById, updateResident, deleteResident } from "@/lib/dal/residents";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resident = await getResidentById(Number(id));
  if (!resident) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(resident);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = await updateResident(Number(id), body);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resident = await getResidentById(Number(id));
  if (!resident) return Response.json({ error: "Not found" }, { status: 404 });
  await deleteResident(Number(id));
  return Response.json({ success: true });
}
