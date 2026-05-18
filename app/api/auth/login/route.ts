import { login } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body ?? {};

  if (!username || !password) {
    return Response.json(
      { error: "Username and password required" },
      { status: 400 }
    );
  }

  const ok = await login(username as string, password as string);
  if (!ok) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return Response.json({ success: true });
}
