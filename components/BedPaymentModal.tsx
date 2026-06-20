"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle, RotateCcw, Check, Pencil, Flame, Clock } from "lucide-react";
import { toast } from "sonner";

interface BedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: number | null;
  residentName: string | null;
  bedName: string | null;
  onSuccess: () => void;
}

export function BedPaymentModal({ open, onOpenChange, residentId, residentName, bedName, onSuccess }: BedPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const [editingField, setEditingField] = useState<"amount" | "fine_amount" | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (open && residentId) {
      fetchPayment();
    } else {
      setPaymentData(null);
      setEditingField(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, residentId]);

  async function fetchPayment() {
    setLoading(true);
    try {
      const date = new Date();
      const year = date.toLocaleString("en-US", { year: "numeric", timeZone: "Asia/Kolkata" });
      const monthNum = date.toLocaleString("en-US", { month: "2-digit", timeZone: "Asia/Kolkata" });
      const monthStr = `${year}-${monthNum}-01`;
      
      const res = await fetch(`/api/payments?resident_id=${residentId}&month=${monthStr}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setPaymentData(data.data[0]);
      } else {
        setPaymentData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function markPaid() {
    if (!paymentData) return;
    setMarkingId(paymentData.id);
    try {
      const res = await fetch(`/api/payments/${paymentData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      });
      if (res.ok) {
        toast.success("Marked as paid");
        setConfirmOpen(false);
        fetchPayment();
        onSuccess();
      } else {
        toast.error("Failed to mark paid");
      }
    } finally {
      setMarkingId(null);
    }
  }

  async function undoPaid() {
    if (!paymentData) return;
    setMarkingId(paymentData.id);
    try {
      const res = await fetch(`/api/payments/${paymentData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: false }),
      });
      if (res.ok) {
        toast.success("Payment undone");
        fetchPayment();
        onSuccess();
      } else {
        toast.error("Failed to undo payment");
      }
    } finally {
      setMarkingId(null);
    }
  }

  async function saveField() {
    if (!paymentData) return;
    const val = Number(editValue);
    if (isNaN(val) || val < 0) { setEditingField(null); return; }
    try {
      const res = await fetch(`/api/payments/${paymentData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editingField as string]: val }),
      });
      if (res.ok) {
        toast.success(`${editingField === "amount" ? "Rent" : "Fine"} updated`);
        fetchPayment();
        onSuccess();
      } else {
        toast.error("Failed to update");
      }
    } finally {
      setEditingField(null);
    }
  }

  function startEdit(field: "amount" | "fine_amount", currentValue: number) {
    setEditingField(field);
    setEditValue(String(currentValue));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Payment for {residentName}</DialogTitle>
          <DialogDescription>Current month payment details</DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : !paymentData ? (
          <div className="py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/10 mt-2">
            No payment record generated for this month yet.
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border/60">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rent</p>
                {editingField === "amount" ? (
                  <Input
                    type="number" className="h-8 w-24 text-sm font-semibold"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveField}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveField();
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    autoFocus
                  />
                ) : paymentData.paid ? (
                  <p className="font-semibold text-lg">₹{Number(paymentData.amount).toLocaleString()}</p>
                ) : (
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors group"
                    onClick={() => startEdit("amount", Number(paymentData.amount))}
                  >
                    <p className="font-semibold text-lg">₹{Number(paymentData.amount).toLocaleString()}</p>
                    <Pencil className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fine</p>
                {editingField === "fine_amount" ? (
                  <Input
                    type="number" className="h-8 w-24 text-sm font-semibold text-warning"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveField}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveField();
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    autoFocus
                  />
                ) : paymentData.paid && Number(paymentData.fine_amount) === 0 ? (
                  <p className="font-semibold text-lg text-muted-foreground/50">—</p>
                ) : paymentData.paid ? (
                  <p className="font-semibold text-lg text-warning flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    +₹{Number(paymentData.fine_amount).toLocaleString()}
                  </p>
                ) : (
                  <div
                    className="flex items-center gap-1.5 cursor-pointer text-warning hover:text-warning/80 transition-colors group"
                    onClick={() => startEdit("fine_amount", Number(paymentData.fine_amount))}
                  >
                    <p className="font-semibold text-lg flex items-center gap-1">
                      {Number(paymentData.fine_amount) > 0 && <Flame className="h-4 w-4" />}
                      {Number(paymentData.fine_amount) > 0 ? `+₹${Number(paymentData.fine_amount).toLocaleString()}` : "—"}
                    </p>
                    <Pencil className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1 text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Due</p>
                <p className="font-bold text-xl text-primary">₹{(Number(paymentData.amount) + Number(paymentData.fine_amount)).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                {paymentData.paid ? (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20">
                    <CheckCircle2 className="h-4 w-4" /> Paid
                  </div>
                ) : paymentData.is_expired ? (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                    <AlertCircle className="h-4 w-4" /> Overdue
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-warning bg-warning/10 px-3 py-1.5 rounded-full border border-warning/20">
                    <Clock className="h-4 w-4" /> Pending
                  </div>
                )}
              </div>
              
              <div>
                {paymentData.paid ? (
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={undoPaid}
                    disabled={markingId !== null}
                  >
                    {markingId === paymentData.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Undo Payment
                  </Button>
                ) : (
                  <Button
                    className="gap-2 bg-success hover:bg-success/90 text-white"
                    onClick={() => setConfirmOpen(true)}
                    disabled={markingId !== null}
                  >
                    {markingId === paymentData.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure to mark payment as done for <span className="font-semibold text-foreground">{residentName}</span> for <span className="font-semibold text-foreground">{new Date().toLocaleString("en-US", { month: "long", timeZone: "Asia/Kolkata" })}</span> in bed <span className="font-semibold text-foreground">{bedName}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); markPaid(); }} 
              className="bg-success hover:bg-success/90 text-white"
              disabled={markingId !== null}
            >
              {markingId !== null ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes, mark as paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
