import { NextRequest, NextResponse } from "next/server";
import { verifySession, getUsers, saveUsers, hashPassword } from "@/lib/auth";
import type { User, SessionPayload } from "@/lib/auth";

const COOKIE_NAME = "session";

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Get all users (admin only)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const users = getUsers().map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
  }));
  return NextResponse.json({ users });
}

// Add a new user (admin only)
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { name, password, role } = await request.json();
  if (!name || !password) {
    return NextResponse.json(
      { error: "Имя и пароль обязательны" },
      { status: 400 }
    );
  }

  const users = getUsers();
  const exists = users.find(
    (u) => u.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    return NextResponse.json(
      { error: "Пользователь с таким именем уже существует" },
      { status: 409 }
    );
  }

  const newUser: User = {
    id: String(Date.now()),
    name,
    password: hashPassword(password),
    role: role || "user",
  };

  users.push(newUser);
  saveUsers(users);

  return NextResponse.json({
    user: { id: newUser.id, name: newUser.name, role: newUser.role },
  });
}

// Delete user (admin only)
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json(
      { error: "ID пользователя обязателен" },
      { status: 400 }
    );
  }

  // Prevent deleting yourself
  if (id === session.userId) {
    return NextResponse.json(
      { error: "Нельзя удалить самого себя" },
      { status: 400 }
    );
  }

  const users = getUsers().filter((u) => u.id !== id);
  saveUsers(users);

  return NextResponse.json({ success: true });
}

// Reset password (admin only)
export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id, newPassword } = await request.json();
  if (!id || !newPassword) {
    return NextResponse.json(
      { error: "ID и новый пароль обязательны" },
      { status: 400 }
    );
  }

  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json(
      { error: "Пользователь не найден" },
      { status: 404 }
    );
  }

  user.password = hashPassword(newPassword);
  saveUsers(users);

  return NextResponse.json({ success: true });
}
