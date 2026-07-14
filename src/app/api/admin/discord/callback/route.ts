import { NextResponse } from "next/server";
import {
  DISCORD_STATE_COOKIE,
  isAllowedDiscordId,
  resolveDiscordUser,
} from "@/lib/discord-auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/session";

function loginError(request: Request, reason: string) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return loginError(request, "discord_invalid");
  }

  const [stateToken, encodedFrom] = state.split(":");
  const expectedStateToken = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${DISCORD_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!stateToken || stateToken !== expectedStateToken) {
    return loginError(request, "discord_invalid");
  }

  const from = encodedFrom ? decodeURIComponent(encodedFrom) : "/admin";
  const redirectUri = `${url.origin}/api/admin/discord/callback`;

  try {
    const discordUser = await resolveDiscordUser(code, redirectUri);

    if (!isAllowedDiscordId(discordUser.id)) {
      return loginError(request, "discord_not_allowed");
    }

    const label = discordUser.global_name ?? discordUser.username;
    const token = await createSessionToken(`discord:${label}`);

    const response = NextResponse.redirect(new URL(from.startsWith("/admin") ? from : "/admin", request.url));
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.delete(DISCORD_STATE_COOKIE);
    return response;
  } catch {
    return loginError(request, "discord_failed");
  }
}
