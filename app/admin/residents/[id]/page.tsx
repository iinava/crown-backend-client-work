import { getResidentById } from "@/lib/dal/residents";
import { getPayments } from "@/lib/dal/payments";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronLeft, User, Phone, Mail, CreditCard, BedDouble, Calendar } from "lucide-react";

export default async function ResidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = await getResidentById(Number(id));
  if (!resident) notFound();

  const { data: payments } = await getPayments({ residentId: Number(id), limit: 12 });

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/admin/residents" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" />
        Back to Residents
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{resident.name}</h1>
          {!resident.is_active && <Badge variant="outline">Inactive</Badge>}
        </div>
        <p className="text-muted-foreground text-sm">Resident profile</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{resident.name}</span>
            </div>
            {resident.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{resident.phone}</span>
              </div>
            )}
            {resident.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{resident.email}</span>
              </div>
            )}
            {resident.id_number && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{resident.id_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
              {resident.bed_number ? (
                <span>
                  Bed <Badge variant="outline">{resident.bed_number}</Badge>
                  {resident.room_number && (
                    <span className="text-muted-foreground ml-1">· Room {resident.room_number}</span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">Not assigned to any bed</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>₹{Number(resident.monthly_rate).toLocaleString()}/month</span>
            </div>
            {resident.move_in_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Moved in {new Date(resident.move_in_date).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment records yet.</p>
        ) : (
          <div className="rounded-md border bg-background divide-y">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(p.month).toLocaleString("default", { month: "long", year: "numeric" })}
                  </p>
                  {p.paid_at && (
                    <p className="text-xs text-muted-foreground">
                      Paid on {new Date(p.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">₹{Number(p.amount).toLocaleString()}</span>
                  {p.paid ? (
                    <Badge variant="secondary">Paid</Badge>
                  ) : (
                    <Badge variant="destructive">Unpaid</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
