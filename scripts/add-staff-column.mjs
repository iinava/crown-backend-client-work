import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Adding is_staff column to residents table...");
  try {
    await sql`ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false`;
    console.log("Column added successfully!");
  } catch (error) {
    console.error("Error adding column:", error);
  }
}

run();
