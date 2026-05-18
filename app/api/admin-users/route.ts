import { isAuthenticated } from "@/lib/auth";
import {
  getAllAdminUsers,
  createAdminUser,
  countAdminUsers,
} from "@/lib/dal/admin-users";
import { NextRequest } from "next/server";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await getAllAdminUsers();
  return Response.json(users);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { username, password } = body ?? {};

  if (!username || !password) {
    return Response.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }
  if ((username as string).length < 3) {
    return Response.json(
      { error: "Username must be at least 3 characters" },
      { status: 400 }
    );
  }
  if ((password as string).length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  try {
    const user = await createAdminUser(username as string, password as string);
    return Response.json(user, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return Response.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return Response.json({ error: "User ID required" }, { status: 400 });
  }

  // Prevent deleting last admin
  const count = await countAdminUsers();
  if (count <= 1) {
    return Response.json(
      { error: "Cannot delete the last admin user" },
      { status: 400 }
    );
  }

  const { deleteAdminUser } = await import("@/lib/dal/admin-users");
  await deleteAdminUser(Number(id));
  return Response.json({ success: true });
}
