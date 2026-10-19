"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Save, IndianRupee, Calendar, Flame, PhoneCall, PhoneOff, Users,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  default_monthly_rate: string;
  grace_period_days: string;
  daily_fine_amount: string;
  voice_reminders_enabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    default_monthly_rate: "",
    grace_period_days: "",
    daily_fine_amount: "",
    voice_reminders_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  const [confirmApplyRent, setConfirmApplyRent] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setSettings({
          default_monthly_rate: String(s.default_monthly_rate ?? 3000),
          grace_period_days:    String(s.grace_period_days    ?? 30),
          daily_fine_amount:    String(s.daily_fine_amount     ?? 50),
          voice_reminders_enabled: s.voice_reminders_enabled !== false,
        });
        setLoading(false);
      });
  }, []);

  async function saveSetting(key: string, value: string, label: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        toast.success(`${label} saved`);
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSaving(null);
    }
  }

  async function confirmToggleVoice() {
    if (pendingToggle === null) return;
    const newValue = pendingToggle;
    setSaving("voice");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "voice_reminders_enabled", value: String(newValue) }),
      });
      if (res.ok) {
        setSettings((p) => ({ ...p, voice_reminders_enabled: newValue }));
        toast.success(newValue ? "Voice reminders enabled" : "Voice reminders disabled");
      } else {
        toast.error("Failed to update");
      }
    } finally {
      setSaving(null);
      setPendingToggle(null);
    }
  }

  async function applyRentToAll() {
    setSaving("apply_rent");
    try {
      const res = await fetch("/api/settings/apply-rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: settings.default_monthly_rate }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Rent updated for ${data.updated} resident${data.updated === 1 ? "" : "s"}`);
      } else {
        toast.error(data.error ?? "Failed to apply rent");
      }
    } finally {
      setSaving(null);
      setConfirmApplyRent(false);
    }
  }

  const rentValue = Number(settings.default_monthly_rate);
  const rentValid = Number.isFinite(rentValue) && rentValue > 0;

  const numericFields = [
    {
      key: "default_monthly_rate" as const,
      label: "Default Monthly Rent",
      suffix: "₹ / month",
      description: "Pre-filled when adding a new resident. Each resident can have their own rate.",
      icon: IndianRupee,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      borderColor: "border-primary/20",
    },
    {
      key: "grace_period_days" as const,
      label: "Grace Period",
      suffix: "days",
      description: "Days after the 1st before a payment is overdue. Due date = 1st + this.",
      icon: Calendar,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      key: "daily_fine_amount" as const,
      label: "Daily Late Fine",
      suffix: "₹ / day",
      description: "Added per day once past the due date. Applied on every fine recalculation.",
      icon: Flame,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
      borderColor: "border-warning/20",
    },
  ];

  const voiceEnabled = settings.voice_reminders_enabled;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Global hostel configuration</p>
      </div>

      {/* Numeric settings grid */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          Payment Configuration
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading settings…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {numericFields.map((f) => (
              <Card
                key={f.key}
                className={`border shadow-sm ${f.borderColor} bg-card`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Icon + label + value unit */}
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${f.iconBg}`}>
                      <f.icon className={`h-4 w-4 ${f.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground">{f.suffix}</p>
                    </div>
                  </div>

                  {/* Input + save button */}
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={settings[f.key]}
                      onChange={(e) =>
                        setSettings((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      className="h-9 bg-muted/50 border-border/60 text-sm"
                      min={0}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveSetting(f.key, settings[f.key], f.label)}
                      disabled={saving === f.key}
                      className="h-9 px-3 shrink-0"
                    >
                      {saving === f.key
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>

                  {f.key === "default_monthly_rate" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9"
                      disabled={!rentValid || saving === "apply_rent"}
                      onClick={() => setConfirmApplyRent(true)}
                    >
                      {saving === "apply_rent"
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        : <Users className="h-3.5 w-3.5 mr-1.5" />}
                      Apply to all existing residents
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Voice reminders toggle */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          Notifications
        </p>
        <Card className={`border shadow-sm max-w-2xl ${voiceEnabled ? "border-green-500/20 bg-green-500/[0.02]" : "border-destructive/20 bg-destructive/[0.02]"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${voiceEnabled ? "bg-green-500/10" : "bg-destructive/10"}`}>
                  {voiceEnabled
                    ? <PhoneCall className="h-4 w-4 text-green-500" />
                    : <PhoneOff className="h-4 w-4 text-destructive" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Voice Call Reminders</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Daily cron calls overdue residents via Vobiz TTS. Fines always recalculate regardless.
                  </p>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 border mt-2 ${
                    voiceEnabled
                      ? "text-green-600 bg-green-500/10 border-green-500/20"
                      : "text-destructive bg-destructive/10 border-destructive/20"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${voiceEnabled ? "bg-green-500" : "bg-destructive"}`} />
                    {voiceEnabled ? "Enabled — calls will be sent" : "Disabled — no calls will be sent"}
                  </span>
                </div>
              </div>
              <Button
                variant={voiceEnabled ? "outline" : "default"}
                size="sm"
                className={`shrink-0 h-9 ${voiceEnabled ? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" : "bg-green-600 hover:bg-green-700 text-white"}`}
                disabled={saving === "voice" || loading}
                onClick={() => setPendingToggle(!voiceEnabled)}
              >
                {saving === "voice"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : voiceEnabled
                    ? <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
                    : <PhoneCall className="h-3.5 w-3.5 mr-1.5" />}
                {voiceEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply rent confirmation dialog */}
      <AlertDialog open={confirmApplyRent} onOpenChange={setConfirmApplyRent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Set rent to ₹{rentValid ? rentValue.toLocaleString("en-IN") : "—"} for all residents?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This overwrites the monthly rate of every active resident (staff excluded), including
              anyone with a custom rate, and saves it as the default. It applies to rent generated
              from now on. Payments already created for this month keep their old amount.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyRentToAll}>Yes, apply to all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle confirmation dialog */}
      <AlertDialog open={pendingToggle !== null} onOpenChange={(open) => { if (!open) setPendingToggle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle ? "Enable voice reminders?" : "Disable voice reminders?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle
                ? "The daily cron will resume making voice calls to overdue residents. This takes effect on the next cron run."
                : "The daily cron will stop making voice calls to overdue residents. Fines will still be recalculated every day. This takes effect immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingToggle ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
              onClick={confirmToggleVoice}
            >
              {pendingToggle ? "Yes, enable" : "Yes, disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
