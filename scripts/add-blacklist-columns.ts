import { sql } from "../lib/db";

async function main() {
  await sql`
    ALTER TABLE residents
      ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS blacklist_reason text
  `;
  console.log("✅ Migration done: is_blacklisted, blacklist_reason added to residents");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
