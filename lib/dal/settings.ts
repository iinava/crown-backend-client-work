import { sql } from "@/lib/db";

export interface Settings {
  default_monthly_rate: number;
  grace_period_days: number;
  daily_fine_amount: number;
}

/** Load all settings as a typed object */
export async function getSettings(): Promise<Settings> {
  const rows = await sql`SELECT key, value FROM settings`;
  const map: Record<string, string> = {};
  for (const r of rows as { key: string; value: string }[]) {
    map[r.key] = r.value;
  }
  return {
    default_monthly_rate: Number(map.default_monthly_rate ?? 3000),
    grace_period_days:    Number(map.grace_period_days    ?? 30),
    daily_fine_amount:    Number(map.daily_fine_amount     ?? 50),
  };
}

/** Save a single setting by key */
export async function saveSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}
