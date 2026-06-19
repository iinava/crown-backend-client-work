import { sql } from "@/lib/db";

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id                 SERIAL PRIMARY KEY,
      resident_id        INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
      bed_id             INTEGER NOT NULL REFERENCES beds(id),
      for_month          TEXT    NOT NULL, -- "YYYY-MM"
      advance_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
      advance_paid_at    DATE,
      advance_method     TEXT    NOT NULL DEFAULT 'cash',
      status             TEXT    NOT NULL DEFAULT 'confirmed',  -- confirmed | converted
      notes              TEXT,
      created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (resident_id, for_month)
    )
  `;
  console.log("✅ bookings table created");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
