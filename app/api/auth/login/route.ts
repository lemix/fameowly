import { NextRequest, NextResponse } from "next/server";
import {
  findUserByName,
  verifyPassword,
  createSession,
} from "@/lib/auth";

const COOKIE_NAME = "session";

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "Имя и пароль обязательны" },
        { status: 400 }
      );
    }

    const user = findUserByName(name);
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Неверное имя или пароль" },
        { status: 401 }
      );
    }

    const token = await createSession(user);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
