"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Users, CheckCircle2, Clock, BedDouble, LogOut, ShieldBan, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHostel } from "@/lib/hostel-context";
import { DatePicker } from "@/components/DatePicker";
import { TableRowSkeleton } from "@/components/skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "active" | "inactive" | "blacklisted" | "all";

interface Resident {
  id: number;
  name: string;
  phone: string | null;
  parent_phone: string | null;
  email: string | null;
  id_number: string | null;
  monthly_rate: string;
  daily_rate: string;
  move_in_date: string | null;
  is_active: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  bed_number: string | null;
  room_number: string | null;
  room_type: string | null;
  has_unpaid: boolean;
  has_payment: boolean;
  move_out_date: string | null;
}

const LIMIT = 15;

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [saving, setSaving] = useState(false);
  const [defaultRate, setDefaultRate] = useState("0");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [phoneError, setPhoneError] = useState("");
  const [checkoutResident, setCheckoutResident] = useState<Resident | null>(null);
  const [checkoutDate, setCheckoutDate] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Blacklist state
  const [blacklistTarget, setBlacklistTarget] = useState<Resident | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklisting, setBlacklisting] = useState(false);

  const { hostelParam, isLoading: hostelLoading } = useHostel();

  const [form, setForm] = useState({
    name: "", phone: "", parent_phone: "", email: "", id_number: "",
    monthly_rate: "", daily_rate: "", move_in_date: "", notes: "",
  });

  const fetchResidents = useCallback(async (signal?: AbortSignal) => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq = hostelParam ? `&hostel=${hostelParam}` : "";
      const fq =
        statusFilter === "active" ? "&active_only=true" :
        statusFilter === "inactive" ? "&inactive_only=true" :
        statusFilter === "blacklisted" ? "&blacklist_only=true" :
        "";
      const res = await fetch(
        `/api/residents?search=${encodeURIComponent(search)}&limit=${LIMIT}&offset=${offset}${hq}${fq}&is_staff=false`,
        { signal }
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setResidents(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Residents fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [search, offset, hostelParam, hostelLoading, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchResidents(controller.signal);
    return () => controller.abort();
  }, [fetchResidents]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(s => {
      setDefaultRate(s.default_monthly_rate ?? "0");
    });
  }, []);

  useEffect(() => { setOffset(0); }, [search, statusFilter]);

  function openAdd() {
    setEditing(null);
    setPhoneError("");
    setForm({ name: "", phone: "", parent_phone: "", email: "", id_number: "", monthly_rate: defaultRate, daily_rate: "", move_in_date: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(r: Resident) {
    setEditing(r);
    setPhoneError("");
    setForm({
      name: r.name, phone: r.phone ?? "", parent_phone: r.parent_phone ?? "",
      email: r.email ?? "",
      id_number: r.id_number ?? "", monthly_rate: r.monthly_rate,
      daily_rate: r.daily_rate ?? "",
      move_in_date: r.move_in_date?.slice(0, 10) ?? "", notes: "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const phoneRegex = /^\d{10}$/;
    if (!form.phone.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!phoneRegex.test(form.phone.trim())) {
      setPhoneError("Enter a valid 10-digit phone number");
      return;
    }
    setPhoneError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        monthly_rate: Number(form.monthly_rate) || 0,
        daily_rate: Number(form.daily_rate) || 0,
      };
      const url = editing ? `/api/residents/${editing.id}` : "/api/residents";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(editing ? "Resident updated" : "Resident added");
        setDialogOpen(false);
        fetchResidents();
      } else {
        const d = await res.json();
        if (d.error === "PHONE_EXISTS" || (d.error && d.error.includes("phone number already exists"))) {
          setPhoneError("A resident with this phone number already exists.");
        } else {
          toast.error(d.error ?? d.message ?? "Failed to save");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/residents/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Resident deleted");
        setDeleteTarget(null);
        fetchResidents();
      } else {
        toast.error("Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  }

  function openCheckout(r: Resident) {
    setCheckoutResident(r);
    setCheckoutDate(new Date().toISOString().slice(0, 10));
  }

  async function handleCheckout() {
    if (!checkoutResident) return;
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/residents/${checkoutResident.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move_out_date: checkoutDate }),
      });
      if (res.ok) {
        toast.success(`${checkoutResident.name} checked out`);
        setCheckoutResident(null);
        fetchResidents();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Checkout failed");
      }
    } finally {
      setCheckingOut(false);
    }
  }

  function openBlacklist(r: Resident) {
    setBlacklistTarget(r);
    setBlacklistReason(r.blacklist_reason ?? "");
  }

  async function handleBlacklist() {
    if (!blacklistTarget) return;
    setBlacklisting(true);
    const isCurrentlyBlacklisted = blacklistTarget.is_blacklisted;
    try {
      const res = await fetch(`/api/residents/${blacklistTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_blacklisted: !isCurrentlyBlacklisted,
          blacklist_reason: isCurrentlyBlacklisted ? null : (blacklistReason.trim() || null),
        }),
      });
      if (res.ok) {
        toast.success(isCurrentlyBlacklisted ? `${blacklistTarget.name} removed from blacklist` : `${blacklistTarget.name} blacklisted`);
        setBlacklistTarget(null);
        setBlacklistReason("");
        fetchResidents();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to update blacklist status");
      }
    } finally {
      setBlacklisting(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const filterLabel = statusFilter === "active" ? "active" : statusFilter === "inactive" ? "former" : statusFilter === "blacklisted" ? "blacklisted" : "total";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Residents</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} {filterLabel} residents</p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Resident
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 bg-muted/50 border-border/60"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-40 bg-muted/50 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Former</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
            <SelectItem value="all">All residents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Phone</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Bed</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Rate</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Payment</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowSkeleton cols={6} rows={7} />
            ) : residents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{search ? "No residents match your search" : "No residents yet"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              residents.map((r) => (
                <TableRow
                  key={r.id}
                  className={`hover:bg-muted/30 transition-colors ${r.is_blacklisted ? "bg-destructive/5" : ""}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/residents/${r.id}`} className="font-medium hover:text-primary transition-colors">
                        {r.name}
                      </Link>
                      {r.is_blacklisted && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/25 rounded-full px-1.5 py-0.5"
                          title={r.blacklist_reason ?? "Blacklisted"}
                        >
                          <ShieldBan className="h-2.5 w-2.5" />
                          Blacklisted
                        </span>
                      )}
                      {!r.is_active && !r.is_blacklisted && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {r.is_blacklisted && r.blacklist_reason && (
                      <p className="text-[11px] text-destructive/70 mt-0.5 max-w-[200px] truncate" title={r.blacklist_reason}>
                        {r.blacklist_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.phone ?? "—"}</TableCell>
                  <TableCell>
                    {r.bed_number ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-0.5">
                        <BedDouble className="h-3 w-3" />{r.bed_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {Number(r.daily_rate) > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        ₹{Number(r.daily_rate).toLocaleString("en-IN")}
                        <span className="text-[10px] text-muted-foreground font-normal">/day</span>
                      </span>
                    ) : (
                      <span>₹{Number(r.monthly_rate).toLocaleString("en-IN")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.has_unpaid ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-1">
                        <Clock className="h-3 w-3" /> Unpaid
                      </span>
                    ) : r.has_payment ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">No record</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {r.is_active && !r.is_blacklisted && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-amber-600" title="Check out" onClick={() => openCheckout(r)}>
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 ${r.is_blacklisted ? "text-destructive hover:text-destructive/70" : "text-muted-foreground hover:text-destructive"}`}
                        title={r.is_blacklisted ? "Remove from blacklist" : "Blacklist resident"}
                        onClick={() => openBlacklist(r)}
                      >
                        {r.is_blacklisted ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Resident" : "Add Resident"}</DialogTitle>
          </DialogHeader>
          {editing?.is_blacklisted && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">This resident is blacklisted</p>
                {editing.blacklist_reason && (
                  <p className="text-xs text-destructive/70 mt-0.5">{editing.blacklist_reason}</p>
                )}
              </div>
            </div>
          )}
          <div className="space-y-3 py-2">
            {(["name", "phone", "parent_phone", "email", "id_number"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field} className="capitalize">
                  {field === "parent_phone" ? "Parent / Guardian Phone" : field.replace("_", " ")}
                  {(field === "name" || field === "phone") && <span className="text-destructive ml-0.5">*</span>}
                  {field === "parent_phone" && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
                </Label>
                <Input
                  id={field}
                  value={form[field]}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, [field]: e.target.value }));
                    if (field === "phone") setPhoneError("");
                  }}
                  placeholder={
                    field === "name" ? "Full name" :
                    field === "phone" ? "10-digit mobile number" :
                    field === "parent_phone" ? "Parent/guardian 10-digit number" :
                    field === "id_number" ? "National ID / Passport" : ""
                  }
                  className={field === "phone" && phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {field === "phone" && phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="monthly_rate">Monthly Rate (₹) <span className="text-muted-foreground text-xs font-normal">— for normal rooms</span></Label>
              <Input
                id="monthly_rate"
                type="number"
                value={form.monthly_rate}
                onChange={(e) => setForm((p) => ({ ...p, monthly_rate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="daily_rate">Daily Rate (₹) <span className="text-muted-foreground text-xs font-normal">— for dormitory rooms</span></Label>
              <Input
                id="daily_rate"
                type="number"
                value={form.daily_rate}
                onChange={(e) => setForm((p) => ({ ...p, daily_rate: e.target.value }))}
                placeholder="0 if not a dorm guest"
              />
            </div>
            <div className="space-y-1">
              <Label>Move-in Date</Label>
              <DatePicker
                value={form.move_in_date}
                onChange={(v) => setForm((p) => ({ ...p, move_in_date: v }))}
                placeholder="Select move-in date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Resident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      <Dialog open={!!checkoutResident} onOpenChange={(open) => { if (!open) setCheckoutResident(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Check Out Resident</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will mark <span className="font-medium text-foreground">{checkoutResident?.name}</span> as inactive and vacate their bed.
            </p>
            <div className="space-y-1">
              <Label>Move-out Date</Label>
              <DatePicker
                value={checkoutDate}
                onChange={setCheckoutDate}
                placeholder="Select move-out date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutResident(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCheckout} disabled={checkingOut || !checkoutDate}>
              {checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blacklist / Unblacklist Dialog */}
      <Dialog open={!!blacklistTarget} onOpenChange={(open) => { if (!open) { setBlacklistTarget(null); setBlacklistReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {blacklistTarget?.is_blacklisted ? (
                <><ShieldCheck className="h-4 w-4 text-green-500" /> Remove from Blacklist</>
              ) : (
                <><ShieldBan className="h-4 w-4 text-destructive" /> Blacklist Resident</>
              )}
            </DialogTitle>
            <DialogDescription>
              {blacklistTarget?.is_blacklisted
                ? <>Remove <span className="font-medium text-foreground">{blacklistTarget?.name}</span> from the blacklist? They can be assigned to beds again.</>
                : <>Blacklisting <span className="font-medium text-foreground">{blacklistTarget?.name}</span> will prevent them from being assigned to any bed. They will <strong>not</strong> be auto-checked out — do that manually next month.</>
              }
            </DialogDescription>
          </DialogHeader>
          {!blacklistTarget?.is_blacklisted && (
            <div className="space-y-1 py-1">
              <Label htmlFor="blacklist-reason">Reason <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Textarea
                id="blacklist-reason"
                placeholder="e.g. Repeated late payments, property damage..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="resize-none h-20 text-sm"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBlacklistTarget(null); setBlacklistReason(""); }} disabled={blacklisting}>
              Cancel
            </Button>
            <Button
              variant={blacklistTarget?.is_blacklisted ? "default" : "destructive"}
              onClick={handleBlacklist}
              disabled={blacklisting}
            >
              {blacklisting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {blacklistTarget?.is_blacklisted ? "Remove from Blacklist" : "Blacklist Resident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Resident</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span> and vacate their bed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
