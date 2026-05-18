import { recalculateFines } from "@/lib/dal/payments";

export async function POST() {
  const updated = await recalculateFines();
  return Response.json({ updated });
}
