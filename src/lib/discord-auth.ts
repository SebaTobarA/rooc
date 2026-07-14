/**
 * OAuth2 de Discord para el login de usuarios (cualquier miembro del server
 * de Special Delivery) y, con el mismo flujo, para el admin (verificado por
 * ADMIN_DISCORD_IDS en el callback). No usa ninguna librería externa: el
 * flujo de Discord es un OAuth2 estándar simple (authorize -> code -> token
 * -> /users/@me).
 *
 * La membresía al server y los roles del usuario se verifican por separado,
 * con el bot (ver src/lib/discord-bot.ts) — este archivo solo resuelve la
 * identidad básica de la cuenta de Discord que inició sesión.
 */

const DISCORD_API = "https://discord.com/api/v10";

export const DISCORD_STATE_COOKIE = "sd_discord_oauth_state";

function getClientId(): string {
  const id = process.env.DISCORD_CLIENT_ID;
  if (!id) throw new Error("Falta DISCORD_CLIENT_ID en las variables de entorno.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.DISCORD_CLIENT_SECRET;
  if (!secret) throw new Error("Falta DISCORD_CLIENT_SECRET en las variables de entorno.");
  return secret;
}

/** Arma la URL de "Iniciar sesión con Discord", con un `state` random para evitar CSRF. */
export function buildDiscordAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Intercambia el `code` recibido en el callback por un access token. */
async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord rechazó el intercambio de código (${response.status}).`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener el usuario de Discord (${response.status}).`);
  }

  return response.json();
}

/** Flujo completo: code -> token -> datos del usuario de Discord. */
export async function resolveDiscordUser(code: string, redirectUri: string): Promise<DiscordUser> {
  const accessToken = await exchangeCodeForToken(code, redirectUri);
  return fetchDiscordUser(accessToken);
}

/** Lista blanca de IDs de Discord con acceso al panel admin. */
export function isAllowedAdminId(discordId: string): boolean {
  const allowed = (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(discordId);
}
