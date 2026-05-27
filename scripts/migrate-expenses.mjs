import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Creating expenses table...");

  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id            SERIAL PRIMARY KEY,
      category      TEXT NOT NULL DEFAULT 'other',
      description   TEXT NOT NULL DEFAULT '',
      amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
      expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
      hostel_id     INTEGER REFERENCES hostels(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_hostel ON expenses (hostel_id)`;

  console.log("✓ expenses table created");
}

migrate().catch(console.error);
