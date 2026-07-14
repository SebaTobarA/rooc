import { NextResponse } from "next/server";
import {
  DISCORD_STATE_COOKIE,
  isAllowedAdminId,
  resolveDiscordUser,
} from "@/lib/discord-auth";
import { getGuildMember } from "@/lib/discord-bot";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/session";
import { prisma } from "@/lib/prisma";

function errorRedirect(request: Request, from: string, reason: string) {
  const target = from.startsWith("/admin") ? "/admin/login" : "/";
  const url = new URL(target, request.url);
  url.searchParams.set("error", reason);
  if (target === "/admin/login") url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return errorRedirect(request, "/panel", "discord_invalid");
  }

  const [stateToken, encodedFrom] = state.split(":");
  const from = encodedFrom ? decodeURIComponent(encodedFrom) : "/panel";

  const expectedStateToken = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${DISCORD_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!stateToken || stateToken !== expectedStateToken) {
    return errorRedirect(request, from, "discord_invalid");
  }

  const redirectUri = `${url.origin}/api/auth/discord/callback`;

  try {
    const discordUser = await resolveDiscordUser(code, redirectUri);

    const member = await getGuildMember(discordUser.id);
    if (!member) {
      return errorRedirect(request, from, "discord_not_member");
    }

    const isAdmin = isAllowedAdminId(discordUser.id);

    await prisma.user.upsert({
      where: { discordId: discordUser.id },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatarHash: discordUser.avatar,
        roles: member.roles,
        isAdmin,
      },
      update: {
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatarHash: discordUser.avatar,
        roles: member.roles,
        isAdmin,
        lastLoginAt: new Date(),
      },
    });

    const token = await createSessionToken({
      discordId: discordUser.id,
      roles: member.roles,
      isAdmin,
    });

    const redirectTo = isAdmin || !from.startsWith("/admin") ? from : "/panel";
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
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
    return errorRedirect(request, from, "discord_failed");
  }
}
