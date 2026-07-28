import { NextResponse } from "next/server";
import { createExpiredSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  response.cookies.set(createExpiredSessionCookie());
  return response;
}
