import { sql } from "../lib/db";

async function main() {
  await sql`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id)
  `;
  console.log("✅ booking_id column added to payments");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
