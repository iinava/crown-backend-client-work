import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

// List all tables
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log("=== TABLES ===");
console.log(tables.map(t => t.table_name).join(", "));

// Get columns for key tables
for (const tbl of ['floors','rooms','beds','bed_assignments','residents','payments','settings','notification_log']) {
  const cols = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ${tbl} ORDER BY ordinal_position`;
  console.log(`\n=== ${tbl.toUpperCase()} ===`);
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})${c.column_default ? ' DEFAULT ' + c.column_default : ''}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`));
}

// Get current data
const floors = await sql`SELECT * FROM floors ORDER BY id`;
console.log("\n=== CURRENT FLOORS ===");
console.log(JSON.stringify(floors, null, 2));

const rooms = await sql`SELECT r.*, f.label as floor_label FROM rooms r JOIN floors f ON f.id = r.floor_id ORDER BY r.id`;
console.log("\n=== CURRENT ROOMS ===");
console.log(JSON.stringify(rooms, null, 2));

const beds = await sql`SELECT b.id, b.room_id, b.number, b.position, r.number as room_number FROM beds b JOIN rooms r ON r.id = b.room_id ORDER BY b.room_id, b.position LIMIT 30`;
console.log("\n=== SAMPLE BEDS ===");
console.log(JSON.stringify(beds, null, 2));
