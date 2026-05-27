"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Users, CheckCircle2, Clock, BedDouble } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHostel } from "@/lib/hostel-context";

interface Resident {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  monthly_rate: string;
  move_in_date: string | null;
  is_active: boolean;
  bed_number: string | null;
  room_number: string | null;
  has_unpaid: boolean;
  has_payment: boolean;
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
  const { hostelParam, isLoading: hostelLoading } = useHostel();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", id_number: "",
    monthly_rate: "", move_in_date: "", notes: "",
  });

  const fetchResidents = useCallback(async () => {
    if (hostelLoading) return;
    setLoading(true);
    try {
      const hq = hostelParam ? `&hostel=${hostelParam}` : "";
      const res = await fetch(
        `/api/residents?search=${encodeURIComponent(search)}&limit=${LIMIT}&offset=${offset}${hq}`
      );
      const data = await res.json();
      setResidents(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, offset, hostelParam, hostelLoading]);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(s => {
      setDefaultRate(s.default_monthly_rate ?? "0");
    });
  }, []);

  useEffect(() => { setOffset(0); }, [search]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", id_number: "", monthly_rate: defaultRate, move_in_date: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(r: Resident) {
    setEditing(r);
    setForm({
      name: r.name, phone: r.phone ?? "", email: r.email ?? "",
      id_number: r.id_number ?? "", monthly_rate: r.monthly_rate,
      move_in_date: r.move_in_date?.slice(0, 10) ?? "", notes: "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, monthly_rate: Number(form.monthly_rate) || 0 };
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
        toast.error(d.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: Resident) {
    if (!confirm(`Delete ${r.name}? This will also vacate their bed.`)) return;
    const res = await fetch(`/api/residents/${r.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Resident deleted");
      fetchResidents();
    } else {
      toast.error("Failed to delete");
    }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Residents</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total residents</p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Resident
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
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Rate</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Payment</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
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
                <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Link href={`/admin/residents/${r.id}`} className="font-medium hover:text-primary transition-colors">
                      {r.name}
                    </Link>
                    {!r.is_active && (
                      <Badge variant="outline" className="ml-2 text-[10px] text-muted-foreground">
                        Inactive
                      </Badge>
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
                    ₹{Number(r.monthly_rate).toLocaleString("en-IN")}
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
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r)}>
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
          <div className="space-y-3 py-2">
            {(["name", "phone", "email", "id_number"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field} className="capitalize">{field.replace("_", " ")}{field === "name" && " *"}</Label>
                <Input
                  id={field}
                  value={form[field]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={field === "name" ? "Full name" : field === "id_number" ? "National ID / Passport" : ""}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="monthly_rate">Monthly Rate (₹)</Label>
              <Input
                id="monthly_rate"
                type="number"
                value={form.monthly_rate}
                onChange={(e) => setForm((p) => ({ ...p, monthly_rate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="move_in_date">Move-in Date</Label>
              <Input
                id="move_in_date"
                type="date"
                value={form.move_in_date}
                onChange={(e) => setForm((p) => ({ ...p, move_in_date: e.target.value }))}
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
    </div>
  );
}
