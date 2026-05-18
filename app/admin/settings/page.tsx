"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, IndianRupee, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  default_monthly_rate: string;
  grace_period_days: string;
  daily_fine_amount: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    default_monthly_rate: "",
    grace_period_days: "",
    daily_fine_amount: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setSettings({
          default_monthly_rate: String(s.default_monthly_rate ?? 3000),
          grace_period_days:    String(s.grace_period_days    ?? 30),
          daily_fine_amount:    String(s.daily_fine_amount     ?? 50),
        });
        setLoading(false);
      });
  }, []);

  async function saveSetting(key: keyof SettingsState, label: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] }),
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

  const fields = [
    {
      key: "default_monthly_rate" as const,
      label: "Monthly Rent (₹)",
      description: "Applied to all residents when generating monthly payments. Every resident pays this same amount.",
      icon: IndianRupee,
      type: "number",
      placeholder: "e.g. 3000",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      key: "grace_period_days" as const,
      label: "Grace Period (days)",
      description: "Number of days after the 1st of the month before a payment is considered overdue. Fines start accruing after this window.",
      icon: Calendar,
      type: "number",
      placeholder: "e.g. 30",
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
    },
    {
      key: "daily_fine_amount" as const,
      label: "Daily Late Fine (₹)",
      description: "Amount added per day once a payment is past its due date. Applied to all overdue unpaid payments when recalculated.",
      icon: AlertTriangle,
      type: "number",
      placeholder: "e.g. 50",
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Global hostel configuration</p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Configuration</CardTitle>
          <CardDescription>
            These settings apply globally to all payment generation and fine calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading settings…</span>
            </div>
          ) : (
            fields.map((f) => (
              <div key={f.key} className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${f.iconBg}`}>
                  <f.icon className={`h-4 w-4 ${f.iconColor}`} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-semibold">{f.label}</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type={f.type}
                      value={settings[f.key]}
                      onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="max-w-[160px] h-9 bg-muted/50 border-border/60"
                      min={0}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveSetting(f.key, f.label)}
                      disabled={saving === f.key}
                      className="h-9 gap-1.5"
                    >
                      {saving === f.key
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 border-dashed shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">How fines work</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When you generate payments, a <strong>due date</strong> is set ({settings.grace_period_days} days after the 1st).
                On the Payments page, click <strong>Recalculate Fines</strong> to apply
                ₹{settings.daily_fine_amount}/day for every day past due. Marking a payment
                as paid clears the fine.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
