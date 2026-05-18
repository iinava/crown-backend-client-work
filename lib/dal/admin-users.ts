import { sql } from "@/lib/db";
import crypto from "crypto";

export interface AdminUser {
  id: number;
  username: string;
  created_at: string;
}

// ---------- hashing helpers ----------

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

// ---------- queries ----------

export async function getAdminUserByUsername(
  username: string
): Promise<{ id: number; username: string; password_hash: string } | null> {
  const rows = await sql`
    SELECT id, username, password_hash FROM admin_users WHERE username = ${username}
  `;
  return (rows[0] as { id: number; username: string; password_hash: string }) ?? null;
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const rows = await sql`
    SELECT id, username, created_at FROM admin_users ORDER BY created_at
  `;
  return rows as AdminUser[];
}

export async function createAdminUser(
  username: string,
  password: string
): Promise<AdminUser> {
  const password_hash = hashPassword(password);
  const rows = await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${password_hash})
    RETURNING id, username, created_at
  `;
  return rows[0] as AdminUser;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await sql`DELETE FROM admin_users WHERE id = ${id}`;
}

export async function changeAdminPassword(
  id: number,
  newPassword: string
): Promise<void> {
  const password_hash = hashPassword(newPassword);
  await sql`UPDATE admin_users SET password_hash = ${password_hash} WHERE id = ${id}`;
}

export async function countAdminUsers(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM admin_users`;
  return (rows[0] as { count: number }).count;
}
