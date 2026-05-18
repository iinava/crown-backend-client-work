import { cookies } from "next/headers";
import { getAdminUserByUsername, verifyPassword } from "@/lib/dal/admin-users";

const SESSION_COOKIE = "hostel_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "changeme";

function makeToken(username: string): string {
  const payload = `${SESSION_SECRET}:${username}:${Date.now()}`;
  return Buffer.from(payload).toString("base64url");
}

function isTokenValid(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    return decoded.startsWith(`${SESSION_SECRET}:`);
  } catch {
    return false;
  }
}

export async function login(
  username: string,
  password: string
): Promise<boolean> {
  const user = await getAdminUserByUsername(username);
  if (!user) return false;
  if (!verifyPassword(password, user.password_hash)) return false;

  const token = makeToken(username);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return isTokenValid(token);
}
