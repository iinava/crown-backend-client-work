import { neon } from "@neondatabase/serverless";

const sql = neon(
  process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_KaHAd9OjyiG4@ep-jolly-moon-aoupyl6z.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
);

const deleted = await sql`DELETE FROM notification_log WHERE sent_date = CURRENT_DATE RETURNING id, resident_id`;
console.log(`✅ Cleared ${deleted.length} notification log entries for today.`);
if (deleted.length > 0) {
  console.log("Deleted rows:", JSON.stringify(deleted, null, 2));
}
