import { NextRequest, NextResponse } from "next/server";
import {
  authorizeAdmin,
  getUsers,
  saveUsers,
  hashPassword,
  bumpSessionVersion,
} from "@/lib/auth";
import type { User, UserRole } from "@/lib/auth";
import { initializeContainer, container } from "@/lib/plugin-loader";

initializeContainer();

const COOKIE_NAME = "session";
const ROLES: UserRole[] = ["admin", "user"];

const FORBIDDEN = NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

function adminToken(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}

// Get all users (admin only)
export async function GET(request: NextRequest) {
  const admin = await authorizeAdmin(adminToken(request));
  if (!admin) return FORBIDDEN;

  const users = getUsers().map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
  }));
  return NextResponse.json({ users });
}

// Add a new user (admin only)
export async function POST(request: NextRequest) {
  const admin = await authorizeAdmin(adminToken(request));
  if (!admin) return FORBIDDEN;

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
    role: ROLES.includes(role) ? role : "user",
    sessionVersion: 1,
  };

  users.push(newUser);
  saveUsers(users);

  return NextResponse.json({
    user: { id: newUser.id, name: newUser.name, role: newUser.role },
  });
}

// Delete user (admin only)
export async function DELETE(request: NextRequest) {
  const admin = await authorizeAdmin(adminToken(request));
  if (!admin) return FORBIDDEN;

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json(
      { error: "ID пользователя обязателен" },
      { status: 400 }
    );
  }

  if (id === admin.id) {
    return NextResponse.json(
      { error: "Нельзя удалить самого себя" },
      { status: 400 }
    );
  }

  const users = getUsers();
  const target = users.find((u) => u.id === id);
  if (!target) {
    return NextResponse.json(
      { error: "Пользователь не найден" },
      { status: 404 }
    );
  }

  saveUsers(users.filter((u) => u.id !== id));
  await container.get("userLifecycle").onUserDeleted(id);

  return NextResponse.json({ success: true });
}

/**
 * Update a user (admin only): reset the password or change the role.
 * Both invalidate the user's existing sessions.
 */
export async function PATCH(request: NextRequest) {
  const admin = await authorizeAdmin(adminToken(request));
  if (!admin) return FORBIDDEN;

  const { id, newPassword, role } = await request.json();
  if (!id || (!newPassword && !role)) {
    return NextResponse.json(
      { error: "Нужен новый пароль или роль" },
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

  if (role) {
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Неизвестная роль" }, { status: 400 });
    }
    if (user.id === admin.id) {
      return NextResponse.json(
        { error: "Нельзя изменить собственную роль" },
        { status: 400 }
      );
    }
    const lastAdmin =
      user.role === "admin" &&
      role !== "admin" &&
      users.filter((u) => u.role === "admin").length === 1;
    if (lastAdmin) {
      return NextResponse.json(
        { error: "В системе должен остаться хотя бы один админ" },
        { status: 400 }
      );
    }
    user.role = role;
  }

  if (newPassword) {
    user.password = hashPassword(newPassword);
  }

  bumpSessionVersion(user);
  saveUsers(users);

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
  });
}
