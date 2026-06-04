"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, AlertCircle, RefreshCw, Check,
  IndianRupee, CheckCircle2, Clock, Flame, Pencil, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import MonthPicker from "@/components/MonthPicker";
import { useHostel } from "@/lib/hostel-context";
import { TableRowSkeleton } from "@/components/skeletons";
import { Input } from "@/components/ui/input";

interface Payment {
  id: number;
  resident_id: number;
  resident_name: string;
  resident_phone?: string | null;
  resident_bed_no?: string | null;
  amount: string;
  fine_amount: string;
  total_due: number;
  due_date: string | null;
  days_overdue: number;
  month: string;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  is_expired: boolean;
  is_dorm?: boolean;
  resident_move_in_date?: string | null;
}

function todayMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "payments" | "expenses" | "summary";

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────
function PaymentsInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const monthParam = searchParams.get("month") ?? todayMonthISO();
  const tabParam = (searchParams.get("tab") ?? "payments") as Tab;
  const [month, setMonthState] = useState(monthParam);
  const [activeTab, setActiveTabState] = useState<Tab>(tabParam);
  const [expensesTotal, setExpensesTotal] = useState(0);

  function setActiveTab(tab: Tab) {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function setMonth(m: string) {
    setMonthState(m);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", m);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const [payments, setPayments]           = useState<Payment[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [generating, setGenerating]       = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [markingId, setMarkingId]         = useState<number | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<number | null>(null);
  const [editField, setEditField] = useState<"amount" | "fine_amount">("amount");
  const [editValue, setEditValue] = useState("");
  const { hostelParam, isLoading: hostelLoading } = useHostel();

  const fetchPayments = useCallback(async (signal?: AbortSignal) => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq  = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(`/api/payments?month=${month}-01&limit=200${hq}`, { signal });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setPayments(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Payments fetch failed:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, hostelParam, hostelLoading]);

  const fetchExpensesTotal = useCallback(async (signal?: AbortSignal) => {
    if (hostelLoading) return;
    try {
      const hq  = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(`/api/expenses?month=${month}-01&limit=200${hq}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      const list: Array<{ amount: string }> = data.data ?? [];
      setExpensesTotal(list.reduce((s, e) => s + Number(e.amount), 0));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, hostelParam, hostelLoading]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPayments(controller.signal);
    fetchExpensesTotal(controller.signal);
    return () => controller.abort();
  }, [fetchPayments, fetchExpensesTotal]);

  async function generatePayments() {
    setGenerating(true);
    try {
      const res  = await fetch("/api/payments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: month + "-01", hostel: hostelParam || undefined }),
      });
      const data = await res.json();
      if (data.generated === 0) {
        toast.info("No new records — payments already generated for this month");
      } else {
        toast.success(`Generated ${data.generated} payment record${data.generated !== 1 ? "s" : ""}`);
      }
      fetchPayments();
    } finally {
      setGenerating(false);
    }
  }

  async function recalculateFines() {
    setRecalculating(true);
    try {
      const res  = await fetch("/api/payments/recalculate-fines", { method: "POST" });
      const data = await res.json();
      toast.success(`Fines updated for ${data.updated} overdue payment${data.updated !== 1 ? "s" : ""}`);
      fetchPayments();
    } finally {
      setRecalculating(false);
    }
  }

  async function markPaid(payment: Payment) {
    setMarkingId(payment.id);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      });
      if (res.ok) {
        toast.success(`${payment.resident_name} marked as paid`);
        fetchPayments();
      } else {
        toast.error("Failed to mark paid");
      }
    } finally {
      setMarkingId(null);
    }
  }

  async function undoPaid(payment: Payment) {
    setMarkingId(payment.id);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: false }),
      });
      if (res.ok) {
        toast.success(`Payment status undone for ${payment.resident_name}`);
        fetchPayments();
      } else {
        toast.error("Failed to undo payment");
      }
    } finally {
      setMarkingId(null);
    }
  }

  async function saveField(payment: Payment) {
    const val = Number(editValue);
    if (isNaN(val) || val < 0) { setEditingAmountId(null); return; }
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editField]: val }),
      });
      if (res.ok) {
        toast.success(`${editField === "amount" ? "Rent" : "Fine"} updated for ${payment.resident_name}`);
        fetchPayments();
      } else {
        toast.error("Failed to update");
      }
    } finally {
      setEditingAmountId(null);
    }
  }

  function startEdit(paymentId: number, field: "amount" | "fine_amount", currentValue: number) {
    setEditingAmountId(paymentId);
    setEditField(field);
    setEditValue(String(currentValue));
  }

  const unpaid    = payments.filter((p) => !p.paid);
  const paid      = payments.filter((p) => p.paid);
  const overdue   = unpaid.filter((p) => p.is_expired);
  const collected = paid.reduce((a, p) => a + Number(p.amount), 0);
  const pending   = unpaid.reduce((a, p) => a + Number(p.total_due), 0);
  const totalFines = unpaid.reduce((a, p) => a + Number(p.fine_amount), 0);

  const [selYear, selMon] = month.split("-").map(Number);
  const monthLabel = new Date(selYear, selMon - 1, 1).toLocaleString("en-IN", {
    month: "long", year: "numeric",
  });
  const isCurrentMonth = month === todayMonthISO();

  // Lazy-load split components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ExpensesTab, setExpensesTab] = useState<React.ComponentType<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [SummaryTab, setSummaryTab]   = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("@/components/ExpensesTab").then((m) => setExpensesTab(() => m.default));
    import("@/components/SummaryTab").then((m)   => setSummaryTab(() => m.default));
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "payments", label: "Payments" },
    { id: "expenses", label: "Expenses" },
    { id: "summary",  label: "Summary"  },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
            <span className="inline-flex items-center gap-1.5 text-base font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-3 py-0.5">
              {monthLabel}
            </span>
            {isCurrentMonth && (
              <span className="text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
                Current month
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {total} payment record{total !== 1 ? "s" : ""}
            {paid.length > 0 && ` · ${paid.length} paid`}
            {unpaid.length > 0 && ` · ${unpaid.length} pending`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          {activeTab === "payments" && (
            <>
              <Button
                variant="outline" size="sm"
                onClick={recalculateFines} disabled={recalculating}
                className="gap-1.5 h-9 border-warning/30 text-warning hover:bg-warning/10"
              >
                {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                Update Fines
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={generatePayments} disabled={generating}
                className="gap-1.5 h-9"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generate
              </Button>
            </>
          )}
        </div>
      </div>


      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-border/60">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Payments tab ── */}
      {activeTab === "payments" && (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-xl font-bold">₹{collected.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">{paid.length} paid</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">₹{pending.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">{unpaid.length} unpaid</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <Flame className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fines Accrued</p>
                  <p className="text-xl font-bold">₹{totalFines.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">{overdue.length} overdue</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{paid.length} / {total}</p>
                  <p className="text-[10px] text-muted-foreground">paid of total</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {overdue.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {overdue.length} overdue payment{overdue.length > 1 ? "s" : ""} — fines accruing daily
                </p>
                <p className="text-xs text-destructive/70 mt-0.5">
                  {overdue.map((p) => `${p.resident_name} (${p.days_overdue}d late)`).join(" · ")}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Resident</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Rent</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Fine</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Total Due</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Due Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="w-[110px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRowSkeleton cols={7} rows={8} />
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <IndianRupee className="h-8 w-8 opacity-30" />
                        <p className="text-sm">No payments for {monthLabel}</p>
                        <p className="text-xs">Click <strong>Generate</strong> to create payment records.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => {
                    const fine      = Number(p.fine_amount);
                    const base      = Number(p.amount);
                    const isMarking = markingId === p.id;

                    return (
                      <TableRow
                        key={p.id}
                        className={
                          p.paid ? "opacity-60"
                          : p.is_expired ? "bg-destructive/[0.03]"
                          : undefined
                        }
                      >
                        <TableCell>
                          <Link
                            href={`/admin/residents/${p.resident_id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {p.resident_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {p.resident_bed_no && (
                              <span className="inline-flex items-center text-[10px] font-semibold bg-muted text-muted-foreground rounded px-1.5 py-0.5 leading-none">
                                Bed {p.resident_bed_no}
                              </span>
                            )}
                            {p.resident_phone && (
                              <span className="text-[11px] text-muted-foreground/70">
                                {p.resident_phone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {editingAmountId === p.id && editField === "amount" ? (
                            <Input
                              type="number" className="h-7 w-24 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveField(p)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveField(p);
                                if (e.key === "Escape") setEditingAmountId(null);
                              }}
                              autoFocus
                            />
                          ) : p.paid ? (
                            <span className="text-muted-foreground/60">₹{base.toLocaleString("en-IN")}</span>
                          ) : (
                            <span
                              className="group/rent inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => startEdit(p.id, "amount", base)}
                              title="Click to edit rent"
                            >
                              ₹{base.toLocaleString("en-IN")}
                              <Pencil className="h-3 w-3 opacity-40 shrink-0" />
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {!p.due_date ? (
                            // Dorm residents: no fines ever
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          ) : p.paid ? (
                            // Paid: show fine as plain text, no editing
                            fine > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground/60">
                                <Flame className="h-3 w-3" />
                                +₹{fine.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            )
                          ) : editingAmountId === p.id && editField === "fine_amount" ? (
                            <Input
                              type="number" className="h-7 w-24 text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveField(p)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveField(p);
                                if (e.key === "Escape") setEditingAmountId(null);
                              }}
                              autoFocus
                            />
                          ) : fine > 0 ? (
                            <span
                              className="group/fine inline-flex items-center gap-1 text-xs font-semibold text-warning cursor-pointer"
                              onClick={() => startEdit(p.id, "fine_amount", fine)}
                              title="Click to edit fine"
                            >
                              <Flame className="h-3 w-3" />
                              +₹{fine.toLocaleString("en-IN")}
                              {p.days_overdue > 0 && (
                                <span className="text-muted-foreground font-normal ml-0.5">
                                  ({p.days_overdue}d)
                                </span>
                              )}
                              <Pencil className="h-3 w-3 opacity-40 shrink-0" />
                            </span>
                          ) : (
                            <span
                              className="group/fine inline-flex items-center gap-1 text-muted-foreground/40 text-xs cursor-pointer hover:text-muted-foreground transition-colors"
                              onClick={() => startEdit(p.id, "fine_amount", 0)}
                              title="Click to add fine"
                            >
                              —
                              <Pencil className="h-3 w-3 opacity-40 shrink-0" />
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className={`font-semibold text-sm ${p.is_expired && !p.paid ? "text-destructive" : ""}`}>
                            ₹{Number(p.total_due ?? base).toLocaleString("en-IN")}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {p.due_date ? (
                            new Date(p.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                          ) : p.resident_move_in_date ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground/50">In:</span>
                              {new Date(p.resident_move_in_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {p.paid ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2.5 py-1">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                              {p.paid_at && (
                                <span className="text-success/60 ml-0.5">
                                  {new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </span>
                              )}
                            </span>
                          ) : p.is_expired ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-1">
                              <AlertCircle className="h-3 w-3" /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/10 border border-warning/20 rounded-full px-2.5 py-1">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {p.paid ? (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => undoPaid(p)}
                              disabled={isMarking}
                            >
                              {isMarking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              Undo
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 gap-1.5 text-xs border-success/30 text-success hover:bg-success/10"
                              onClick={() => markPaid(p)}
                              disabled={isMarking}
                            >
                              {isMarking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── Expenses tab ── */}
      {activeTab === "expenses" && (
        ExpensesTab
          ? <ExpensesTab
              month={month}
              hostelParam={hostelParam}
              hostelLoading={hostelLoading}
              onTotalChange={setExpensesTotal}
            />
          : <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
      )}

      {/* ── Summary tab ── */}
      {activeTab === "summary" && (
        SummaryTab
          ? <SummaryTab
              collected={collected}
              pending={pending}
              expenses={expensesTotal}
              paidCount={paid.length}
              unpaidCount={unpaid.length}
              monthLabel={monthLabel}
            />
          : <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
      )}
    </div>
  );
}

// ─── Suspense wrapper (required for useSearchParams in Next.js) ───────────────
export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    }>
      <PaymentsInner />
    </Suspense>
  );
}
