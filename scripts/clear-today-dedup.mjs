/**
 * clear-today-dedup.mjs
 *
 * Clears today's notification_log rows so the daily-reminders cron
 * will re-send voice calls that were already deduped today.
 *
 * Run with:
 *   node --env-file=.env scripts/clear-today-dedup.mjs
 */

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Run with: node --env-file=.env scripts/clear-today-dedup.mjs");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Preview what will be deleted
const preview = await sql`
  SELECT n.id, r.name AS resident_name, n.channel, n.status, n.sent_at
  FROM notification_log n
  JOIN residents r ON r.id = n.resident_id
  WHERE n.sent_date = CURRENT_DATE
  ORDER BY n.sent_at DESC
`;

if (preview.length === 0) {
  console.log("✅  No dedup rows found for today — nothing to clear.");
  process.exit(0);
}

console.log(`\n📋  Found ${preview.length} row(s) for today:\n`);
preview.forEach((row) =>
  console.log(`  • [${row.id}] ${row.resident_name} — ${row.channel} — ${row.status} @ ${new Date(row.sent_at).toLocaleTimeString("en-IN")}`)
);

// Delete
const deleted = await sql`
  DELETE FROM notification_log
  WHERE sent_date = CURRENT_DATE
  RETURNING id
`;

console.log(`\n🗑️   Cleared ${deleted.length} dedup row(s). Cron will re-call these residents on next run.\n`);
