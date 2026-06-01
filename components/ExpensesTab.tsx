"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pencil, Receipt, TrendingDown, Coins, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Expense {
  id: number;
  title: string;
  amount: string;
  category: string;
  date: string;
  notes: string | null;
}

const CATEGORIES = [
  "maintenance", "utilities", "salaries", "groceries", "repairs", "cleaning", "bills", "other",
];

const CAT_LABELS: Record<string, string> = {
  maintenance: "Maintenance", utilities: "Utilities", salaries: "Salaries",
  groceries: "Groceries", repairs: "Repairs", cleaning: "Cleaning", bills: "Bills", other: "Other",
};

const CAT_COLORS: Record<string, string> = {
  maintenance: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  utilities:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
  salaries:    "bg-purple-500/10 text-purple-500 border-purple-500/20",
  groceries:   "bg-green-500/10 text-green-500 border-green-500/20",
  repairs:     "bg-red-500/10 text-red-500 border-red-500/20",
  cleaning:    "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  bills:       "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  other:       "bg-muted text-muted-foreground border-border",
};

interface Props {
  month: string;        // "YYYY-MM"
  hostelParam: string;
  hostelLoading: boolean;
  onTotalChange: (total: number) => void;
}

const blank = { title: "", amount: "", category: "other", date: "", notes: "" };

export default function ExpensesTab({ month, hostelParam, hostelLoading, onTotalChange }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing, setEditing]   = useState<Expense | null>(null);
  const [form, setForm]         = useState(blank);

  const monthFirst = month + "-01";

  const fetchExpenses = useCallback(async () => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq  = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(`/api/expenses?month=${monthFirst}&limit=200${hq}`);
      const data = await res.json();
      const list: Expense[] = data.data ?? [];
      setExpenses(list);
      onTotalChange(list.reduce((s, e) => s + Number(e.amount), 0));
    } finally {
      setLoading(false);
    }
  }, [month, hostelParam, hostelLoading, onTotalChange]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  function openAdd() {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setForm({ ...blank, date: today });
    setOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      title:    e.title,
      amount:   String(e.amount),
      category: e.category,
      date:     e.date.slice(0, 10),
      notes:    e.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.amount || !form.date) {
      toast.error("Title, amount and date are required");
      return;
    }
    setSaving(true);
    try {
      const hq = hostelParam || undefined;
      if (editing) {
        const res = await fetch(`/api/expenses/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount: Number(form.amount) }),
        });
        if (res.ok) { toast.success("Expense updated"); setOpen(false); fetchExpenses(); }
        else toast.error("Failed to update");
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount: Number(form.amount), hostel: hq }),
        });
        if (res.ok) { toast.success("Expense added"); setOpen(false); fetchExpenses(); }
        else toast.error("Failed to add expense");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, title: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success(`"${title}" deleted`); fetchExpenses(); }
      else toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Find largest expense
  const largestExpense = expenses.length > 0
    ? expenses.reduce((prev, current) => (Number(prev.amount) > Number(current.amount)) ? prev : current)
    : null;

  // Find top category by spending
  const categorySpending: Record<string, number> = {};
  expenses.forEach((e) => {
    categorySpending[e.category] = (categorySpending[e.category] || 0) + Number(e.amount);
  });
  let topCategory = "";
  let topCategoryAmount = 0;
  Object.entries(categorySpending).forEach(([cat, amt]) => {
    if (amt > topCategoryAmount) {
      topCategory = cat;
      topCategoryAmount = amt;
    }
  });

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold">₹{totalExpenses.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">{expenses.length} transaction{expenses.length !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Card 2: Transactions Count */}
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expenses Logged</p>
              <p className="text-xl font-bold">{expenses.length}</p>
              <p className="text-[10px] text-muted-foreground">items this month</p>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Card 3: Largest Expense */}
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Largest Expense</p>
              <p className="text-xl font-bold">
                {largestExpense ? `₹${Number(largestExpense.amount).toLocaleString("en-IN")}` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={largestExpense?.title ?? ""}>
                {largestExpense ? largestExpense.title : "No records yet"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Card 4: Top Category */}
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Tag className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Category</p>
              <p className="text-xl font-bold truncate max-w-[130px]">
                {topCategory ? (CAT_LABELS[topCategory] ?? topCategory) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {topCategory ? `₹${topCategoryAmount.toLocaleString("en-IN")} spent` : "No records yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Expenses Log</h2>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Title</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Category</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Date</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Amount</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Notes</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No expenses logged for this month</p>
                    <p className="text-xs">Click <strong>Add Expense</strong> to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-0.5 ${CAT_COLORS[e.category] ?? CAT_COLORS.other}`}>
                      {CAT_LABELS[e.category] ?? e.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </TableCell>
                  <TableCell className="font-semibold text-destructive">
                    ₹{Number(e.amount).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-title">Title *</Label>
              <Input
                id="exp-title"
                placeholder="e.g. Electricity bill"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">Amount (₹) *</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Date *</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="exp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CAT_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-notes">Notes</Label>
              <Textarea
                id="exp-notes"
                placeholder="Optional notes..."
                className="resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
