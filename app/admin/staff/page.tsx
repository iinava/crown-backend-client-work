"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Users, BedDouble } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHostel } from "@/lib/hostel-context";
import { DatePicker } from "@/components/DatePicker";
import { TableRowSkeleton } from "@/components/skeletons";

interface StaffMember {
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
  bed_number: string | null;
  room_number: string | null;
  room_type: string | null;
  has_unpaid: boolean;
  has_payment: boolean;
  move_out_date: string | null;
}

const LIMIT = 15;

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { hostelParam, isLoading: hostelLoading } = useHostel();

  const [form, setForm] = useState({
    name: "", phone: "", parent_phone: "", email: "", id_number: "",
    move_in_date: "", notes: "",
  });

  const fetchStaff = useCallback(async (signal?: AbortSignal) => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(
        `/api/residents?search=${encodeURIComponent(search)}&limit=${LIMIT}&offset=${offset}${hq}&is_staff=true`,
        { signal }
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setStaff(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Staff fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [search, offset, hostelParam, hostelLoading]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStaff(controller.signal);
    return () => controller.abort();
  }, [fetchStaff]);

  useEffect(() => { setOffset(0); }, [search]);

  function openAdd() {
    setEditing(null);
    setPhoneError("");
    setForm({ name: "", phone: "", parent_phone: "", email: "", id_number: "", move_in_date: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(r: StaffMember) {
    setEditing(r);
    setPhoneError("");
    setForm({
      name: r.name,
      phone: r.phone ?? "",
      parent_phone: r.parent_phone ?? "",
      email: r.email ?? "",
      id_number: r.id_number ?? "",
      move_in_date: r.move_in_date?.slice(0, 10) ?? "",
      notes: "",
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
        monthly_rate: 0,
        daily_rate: 0,
        is_staff: true,
      };
      const url = editing ? `/api/residents/${editing.id}` : "/api/residents";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(editing ? "Staff updated" : "Staff added");
        setDialogOpen(false);
        fetchStaff();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to save");
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
        toast.success("Staff deleted");
        setDeleteTarget(null);
        fetchStaff();
      } else {
        toast.error("Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} staff members</p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-9 bg-muted/50 border-border/60"
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Phone</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Bed</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowSkeleton cols={4} rows={7} />
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{search ? "No staff match your search" : "No staff yet"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              staff.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Link href={`/admin/staff/${r.id}`} className="font-medium hover:text-primary transition-colors">
                      {r.name}
                    </Link>
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
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
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
            <DialogTitle>{editing ? "Edit Staff" : "Add Staff"}</DialogTitle>
          </DialogHeader>
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
              {editing ? "Save Changes" : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Staff</DialogTitle>
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
