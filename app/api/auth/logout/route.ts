import { NextResponse } from "next/server";

const COOKIE_NAME = "session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
