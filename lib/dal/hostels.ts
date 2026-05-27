import { sql } from "@/lib/db";

export interface Hostel {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export async function getAllHostels(): Promise<Hostel[]> {
  const rows = await sql`SELECT id, name, slug, created_at FROM hostels ORDER BY id`;
  return rows as Hostel[];
}

export async function getHostelBySlug(slug: string): Promise<Hostel | null> {
  const rows = await sql`SELECT id, name, slug, created_at FROM hostels WHERE slug = ${slug}`;
  return (rows[0] as Hostel) ?? null;
}
