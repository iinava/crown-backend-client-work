"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useHostel } from "@/lib/hostel-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, Trash2, BedDouble, CalendarDays,
  IndianRupee, Users, CheckCircle2, ChevronsUpDown, Check, Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";

interface Booking {
  id: number;
  resident_id: number;
  bed_id: number;
  for_month: string;
  advance_amount: string;
  advance_paid_at: string | null;
  advance_method: string;
  status: string;
  notes: string | null;
  resident_name: string;
  resident_phone: string | null;
  bed_number: string;
  room_number: string;
  hostel_name: string;
}

interface ResidentOption {
  id: number;
  name: string;
  phone: string | null;
}

interface BedOption {
  bed_id: number;
  bed_number: string;
  room_number: string;
  hostel_name: string;
}

const METHODS = ["cash", "upi", "bank_transfer"] as const;

function nextMonthISO() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

// ── Resident Combobox ─────────────────────────────────────────────────────────
function ResidentCombobox({
  value, onChange, hostelParam,
}: {
  value: ResidentOption | null;
  onChange: (r: ResidentOption | null) => void;
  hostelParam: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<ResidentOption[]>([]);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Server-side search — fires on every keystroke (debounced 280ms)
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const hq = hostelParam ? `&hostel=${hostelParam}` : "";
    const t = setTimeout(() => {
      fetch(
        `/api/residents?active_only=true&is_staff=false&no_bed=true&limit=30&search=${encodeURIComponent(query.trim())}${hq}`
      )
        .then(r => r.json())
        .then(d => setResults(d.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [query, open, hostelParam]);

  // Focus the search input when popover opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background",
            "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-colors duration-150",
            !value && "text-muted-foreground"
          )}
        >
          {value ? (
            <span className="flex flex-col items-start leading-tight text-left">
              <span className="font-medium text-foreground">{value.name}</span>
              {value.phone && <span className="text-[11px] text-muted-foreground">{value.phone}</span>}
            </span>
          ) : (
            <span>Select resident (no bed)…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-border/60 px-3 py-2 gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
        </div>

        {/* Results */}
        <div className="max-h-52 overflow-y-auto py-1">
          {!loading && results.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              {query ? "No unassigned residents found" : "No residents without a bed"}
            </p>
          ) : (
            results.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onChange(r); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  value?.id === r.id && "bg-accent/50"
                )}
              >
                <Check className={cn("h-3.5 w-3.5 text-primary shrink-0", value?.id === r.id ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 min-w-0">
                  <span className="font-medium block truncate">{r.name}</span>
                  {r.phone && <span className="text-[11px] text-muted-foreground">{r.phone}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { hostelParam, isLoading: hostelLoading } = useHostel();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterMonth, setFilterMonth] = useState(nextMonthISO());

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Form
  const [selectedResident, setSelectedResident] = useState<ResidentOption | null>(null);
  const [selectedBed, setSelectedBed]           = useState<BedOption | null>(null);
  const [bedSearch, setBedSearch]               = useState("");
  const [beds, setBeds]                         = useState<BedOption[]>([]);
  const [loadingBeds, setLoadingBeds]           = useState(false);

  const [form, setForm] = useState({
    for_month:       nextMonthISO(),
    advance_amount:  "",
    advance_paid_at: todayISO(),
    advance_method:  "cash" as typeof METHODS[number],
    notes:           "",
  });

  // ── Fetch bookings ─────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq  = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(`/api/bookings?for_month=${filterMonth}${hq}`);
      if (!res.ok) throw new Error("fetch failed");
      setBookings(await res.json());
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [filterMonth, hostelParam, hostelLoading]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Bed search (server-side) ───────────────────────────────────────────────
  useEffect(() => {
    if (!dialogOpen || bedSearch.trim().length < 1) { setBeds([]); return; }
    setLoadingBeds(true);
    const t = setTimeout(() => {
      fetch(`/api/beds/search?q=${encodeURIComponent(bedSearch.trim())}`)
        .then(r => r.json()).then(setBeds)
        .catch(() => setBeds([]))
        .finally(() => setLoadingBeds(false));
    }, 280);
    return () => clearTimeout(t);
  }, [bedSearch, dialogOpen]);

  function openAdd() {
    setSelectedResident(null);
    setSelectedBed(null);
    setBedSearch("");
    setBeds([]);
    setForm({ for_month: nextMonthISO(), advance_amount: "", advance_paid_at: todayISO(), advance_method: "cash", notes: "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!selectedResident) { toast.error("Select a resident"); return; }
    if (!selectedBed)      { toast.error("Select a bed"); return; }
    const amt = Number(form.advance_amount);
    if (isNaN(amt) || amt < 0) { toast.error("Enter a valid advance amount"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id:     selectedResident.id,
          bed_id:          selectedBed.bed_id,
          for_month:       form.for_month,
          advance_amount:  amt,
          advance_paid_at: form.advance_paid_at || null,
          advance_method:  form.advance_method,
          notes:           form.notes || null,
        }),
      });
      if (res.ok) {
        toast.success("Booking created");
        setDialogOpen(false);
        fetchBookings();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to create booking");
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookings/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Booking removed");
        setDeleteTarget(null);
        fetchBookings();
      } else {
        toast.error("Failed to remove booking");
      }
    } finally {
      setDeleting(false);
    }
  }

  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
  const convertedCount = bookings.filter(b => b.status === "converted").length;
  const totalAdvance   = bookings.filter(b => b.status === "confirmed")
    .reduce((s, b) => s + Number(b.advance_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">Advance bookings for future move-ins</p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <MonthPicker value={filterMonth} onChange={setFilterMonth} />
        <span className="text-sm text-muted-foreground">
          Showing bookings for <span className="font-medium text-foreground">{monthLabel(filterMonth)}</span>
        </span>
      </div>

      {/* Stat chips */}
      {!loading && bookings.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">{confirmedCount}</span>
            <span className="text-muted-foreground">pending move-in</span>
          </div>
          {convertedCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium">{convertedCount}</span>
              <span className="text-muted-foreground">converted</span>
            </div>
          )}
          {totalAdvance > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <IndianRupee className="h-4 w-4 text-primary" />
              <span className="font-medium">₹{totalAdvance.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">advance held</span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Resident</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Bed Booked</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">For Month</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Advance</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Paid On</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No bookings for {monthLabel(filterMonth)}</p>
                    <p className="text-xs opacity-60">Click "New Booking" to add one</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map(b => (
                <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <p className="font-medium">{b.resident_name}</p>
                    {b.resident_phone && <p className="text-[11px] text-muted-foreground/70">{b.resident_phone}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-0.5">
                      <BedDouble className="h-3 w-3" />{b.bed_number}
                    </span>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{b.hostel_name}</p>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{monthLabel(b.for_month)}</TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold">₹{Number(b.advance_amount).toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-muted-foreground/70 capitalize">{b.advance_method.replace("_", " ")}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.advance_paid_at
                      ? new Date(b.advance_paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {b.status === "converted" ? (
                      <Badge className="bg-success/10 text-success border border-success/25 text-[10px] gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Converted
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px]">
                        Confirmed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(b)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── New Booking Dialog ────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
            <DialogDescription>
              Resident must already be created. Only residents without a bed are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">

            {/* ── Resident picker (Popover combobox) ── */}
            <div className="space-y-1.5">
              <Label>Resident <span className="text-destructive">*</span></Label>
              <ResidentCombobox
                value={selectedResident}
                onChange={setSelectedResident}
                hostelParam={hostelParam}
              />
            </div>

            {/* ── Bed picker (inline search + list) ── */}
            <div className="space-y-1.5">
              <Label>Bed to Book <span className="text-destructive">*</span></Label>
              {selectedBed ? (
                <div className="flex items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-2">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5 text-primary" />
                    {selectedBed.bed_number}
                    <span className="text-xs font-normal text-muted-foreground">· {selectedBed.hostel_name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedBed(null); setBedSearch(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Type bed number (e.g. c3-14)…"
                      value={bedSearch}
                      onChange={e => setBedSearch(e.target.value)}
                    />
                    {loadingBeds && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  {beds.length > 0 && (
                    <div className="rounded-md border border-border/60 overflow-hidden max-h-40 overflow-y-auto">
                      {beds.map(b => (
                        <button
                          key={b.bed_id}
                          type="button"
                          onClick={() => { setSelectedBed(b); setBedSearch(""); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <BedDouble className="h-3.5 w-3.5 text-primary shrink-0" />{b.bed_number}
                          </span>
                          <span className="text-xs text-muted-foreground">{b.hostel_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Booking month ── */}
            <div className="space-y-1.5">
              <Label>Booking For Month <span className="text-destructive">*</span></Label>
              <MonthPicker value={form.for_month} onChange={v => setForm(p => ({ ...p, for_month: v }))} />
            </div>

            {/* ── Advance amount + method ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Advance Amount (₹)</Label>
                <Input
                  type="number" min="0" placeholder="0"
                  value={form.advance_amount}
                  onChange={e => setForm(p => ({ ...p, advance_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={form.advance_method} onValueChange={v => setForm(p => ({ ...p, advance_method: v as typeof METHODS[number] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Date received ── */}
            <div className="space-y-1.5">
              <Label>Advance Received On</Label>
              <Input
                type="date"
                value={form.advance_paid_at}
                onChange={e => setForm(p => ({ ...p, advance_paid_at: e.target.value }))}
              />
            </div>

            {/* ── Notes ── */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input
                placeholder="Any additional notes…"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {/* Info note */}
            {Number(form.advance_amount) > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary/80">
                ₹{Number(form.advance_amount).toLocaleString("en-IN")} will be deducted from{" "}
                <strong>{monthLabel(form.for_month)}</strong>'s rent when payments are generated.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Booking</DialogTitle>
            <DialogDescription>
              Remove the booking for <span className="font-medium text-foreground">{deleteTarget?.resident_name}</span>?
              {Number(deleteTarget?.advance_amount) > 0 && (
                <> The ₹{Number(deleteTarget?.advance_amount).toLocaleString("en-IN")} advance will no longer be deducted from their rent.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
