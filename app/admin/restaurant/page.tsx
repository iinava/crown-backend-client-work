"use client";

import { useState, useEffect, useCallback } from "react";
import { useHostel } from "@/lib/hostel-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Plus, Trash2, Pencil, Utensils, TrendingDown, Receipt, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import MonthPicker from "@/components/MonthPicker";

interface FoodEntry {
  id: number;
  title: string;
  amount: string;
  date: string;
  notes: string | null;
  category: string;
}

function todayMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const blankForm = { title: "", amount: "", date: "", notes: "" };

export default function RestaurantPage() {
  const { hostelParam, label: hostelLabel, isLoading: hostelLoading } = useHostel();

  const [month, setMonth]       = useState(todayMonthISO());
  const [entries, setEntries]   = useState<FoodEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing, setEditing]   = useState<FoodEntry | null>(null);
  const [form, setForm]         = useState(blankForm);

  const monthFirst = month + "-01";

  const [selYear, selMon] = month.split("-").map(Number);
  const monthLabel = new Date(selYear, selMon - 1, 1).toLocaleString("en-IN", {
    month: "long", year: "numeric",
  });

  const fetchEntries = useCallback(async () => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq  = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(`/api/expenses?month=${monthFirst}&category=food&limit=200${hq}`);
      const data = await res.json();
      setEntries(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [month, hostelParam, hostelLoading]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function openAdd() {
    setEditing(null);
    setForm({ ...blankForm, date: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  function openEdit(e: FoodEntry) {
    setEditing(e);
    setForm({
      title:  e.title,
      amount: String(e.amount),
      date:   e.date.slice(0, 10),
      notes:  e.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.amount || !form.date) {
      toast.error("Amount and date are required");
      return;
    }
    const titleValue = form.title.trim() || "food";
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/expenses/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:    titleValue,
            amount:   Number(form.amount),
            date:     form.date,
            notes:    form.notes || null,
            category: "food",
          }),
        });
        if (res.ok) {
          toast.success("Entry updated");
          setOpen(false);
          fetchEntries();
        } else {
          toast.error("Failed to update entry");
        }
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:    titleValue,
            amount:   Number(form.amount),
            category: "food",
            date:     form.date,
            notes:    form.notes || undefined,
            hostel:   hostelParam || undefined,
          }),
        });
        if (res.ok) {
          toast.success("Food entry added");
          setOpen(false);
          fetchEntries();
        } else {
          toast.error("Failed to add entry");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, title: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${title}" deleted`);
        fetchEntries();
      } else {
        toast.error("Failed to delete");
      }
    } finally {
      setDeleting(null);
    }
  }

  const totalSpend = entries.reduce((s, e) => s + Number(e.amount), 0);
  const avgPerDay  = entries.length > 0 ? Math.round(totalSpend / entries.length) : 0;

  // Group by date for the timeline view
  const byDate = entries.reduce<Record<string, FoodEntry[]>>((acc, e) => {
    const day = e.date.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Utensils className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Restaurant</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {hostelLabel} — food purchase log
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Entry
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Spend</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ₹{totalSpend.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Entries</p>
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">purchases logged</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Avg / Entry</p>
              <p className="text-2xl font-bold">₹{avgPerDay.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">per purchase</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Purchase Log — {monthLabel}</h2>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Item / Description</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Date</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Amount</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Notes</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Utensils className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">No food purchases logged for {monthLabel}</p>
                    <p className="text-xs">Click <strong>Add Entry</strong> to record a purchase.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedDates.map((day) => {
                const dayEntries = byDate[day];
                const dayTotal   = dayEntries.reduce((s, e) => s + Number(e.amount), 0);
                const dateLabel  = new Date(day + "T00:00:00").toLocaleDateString("en-IN", {
                  weekday: "short", day: "2-digit", month: "short", year: "numeric",
                });
                return (
                  <>
                    {/* Date group header */}
                    <TableRow key={`hdr-${day}`} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={3} className="py-1.5 px-4">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          {dateLabel}
                        </span>
                      </TableCell>
                      <TableCell colSpan={2} className="py-1.5 px-4 text-right">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          ₹{dayTotal.toLocaleString("en-IN")}
                        </span>
                      </TableCell>
                    </TableRow>
                    {dayEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(e.date + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-amber-600 dark:text-amber-400">
                          ₹{Number(e.amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {e.notes ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(e.id, e.title)}
                              disabled={deleting === e.id}
                            >
                              {deleting === e.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-500" />
              {editing ? "Edit Food Entry" : "Add Food Purchase"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="food-title">Item / Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                id="food-title"
                placeholder="e.g. Breakfast supplies, Vegetables"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="food-amount">Amount (₹) *</Label>
                <Input
                  id="food-amount"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="food-date">Date *</Label>
                <Input
                  id="food-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="food-notes">Notes</Label>
              <Textarea
                id="food-notes"
                placeholder="Optional — vendor name, items breakdown, etc."
                className="resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
