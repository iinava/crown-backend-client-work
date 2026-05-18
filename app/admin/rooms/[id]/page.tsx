import { getRoomById, getRoomWithBeds } from "@/lib/dal/rooms";
import { notFound } from "next/navigation";
import RoomDetailClient from "./RoomDetailClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [room, beds] = await Promise.all([
    getRoomById(Number(id)),
    getRoomWithBeds(Number(id)),
  ]);

  if (!room) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/rooms" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" />
        Back to Rooms
      </Link>
      <RoomDetailClient room={{ ...room, floor_label: room.floor_label ?? "", beds }} />
    </div>
  );
}
