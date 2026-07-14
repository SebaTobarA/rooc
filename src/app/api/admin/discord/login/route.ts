import { NextResponse } from "next/server";
import { buildDiscordAuthorizeUrl, DISCORD_STATE_COOKIE } from "@/lib/discord-auth";

/**
 * Inicia el flujo de "Iniciar sesión con Discord". Guarda un token random
 * en una cookie de corta duración para poder verificar el `state` que
 * Discord devuelve en el callback (protección CSRF básica), y codifica en
 * el mismo `state` a dónde volver después de loguearse (`from`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "/admin";

  const stateToken = crypto.randomUUID();
  const state = `${stateToken}:${encodeURIComponent(from)}`;
  const redirectUri = `${url.origin}/api/admin/discord/callback`;

  const response = NextResponse.redirect(buildDiscordAuthorizeUrl(redirectUri, state));
  response.cookies.set(DISCORD_STATE_COOKIE, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutos, alcanza de sobra para completar el login
  });
  return response;
}
