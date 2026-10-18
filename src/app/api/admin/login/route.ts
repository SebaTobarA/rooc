import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { isPasswordLoginEnabled } from "@/lib/password-login";

// Freno contra quien prueba contraseñas en masa: intentos fallidos por IP en
// los últimos 15 minutos. Vive en memoria de cada instancia, así que no es
// exacto, pero sumado a la espera fija por intento y al largo mínimo de la
// contraseña vuelve inviable adivinarla.
const FAILED_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const failedAttempts = new Map<string, number[]>();

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}

function recentFailures(ip: string): number[] {
  const now = Date.now();
  const recent = (failedAttempts.get(ip) ?? []).filter((at) => now - at < FAILED_WINDOW_MS);
  failedAttempts.set(ip, recent);
  return recent;
}

// Compara en tiempo constante hasheando ambos valores primero, así el largo
// de la contraseña ingresada no se filtra por el tiempo de respuesta.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  if (!isPasswordLoginEnabled()) {
    return NextResponse.json({ error: "El ingreso con contraseña está desactivado." }, { status: 404 });
  }

  const ip = clientIp(request);
  if (recentFailures(ip).length >= MAX_FAILED_ATTEMPTS) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "too_many");
    return NextResponse.redirect(url, { status: 303 });
  }

  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const from = safeRedirectPath(String(form.get("from") ?? ""), "/admin");

  const expectedUsername = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  const isValid =
    safeEqual(username, expectedUsername) &&
    safeEqual(password, expectedPassword);

  if (!isValid) {
    failedAttempts.set(ip, [...recentFailures(ip), Date.now()]);
    console.warn(`admin/login: intento fallido desde ${ip}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
