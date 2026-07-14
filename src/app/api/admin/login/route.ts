import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/session";

// Compara en tiempo constante hasheando ambos valores primero, así el largo
// de la contraseña ingresada no se filtra por el tiempo de respuesta.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const from = String(form.get("from") ?? "/admin");

  const expectedUsername = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  const isValid =
    safeEqual(username, expectedUsername) &&
    safeEqual(password, expectedPassword);

  if (!isValid) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "1");
    if (from) url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await createSessionToken({ username, roles: [], isAdmin: true });
  const redirectTo = from.startsWith("/admin") ? from : "/admin";
  const response = NextResponse.redirect(new URL(redirectTo, request.url), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
