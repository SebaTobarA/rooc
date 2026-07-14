/**
 * Sesión firmada con HMAC-SHA256, compartida por el login de usuario
 * (Discord, cualquier miembro del server) y el login de admin (Discord con
 * ID en ADMIN_DISCORD_IDS, o usuario/contraseña como alternativa).
 *
 * Se usa Web Crypto (`crypto.subtle`) en vez de el módulo `node:crypto`
 * porque este archivo se importa tanto desde `proxy.ts` (Edge runtime)
 * como desde route handlers (Node runtime), y Web Crypto funciona en ambos.
 */

export const SESSION_COOKIE_NAME = "sd_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = {
  // Presente en sesiones creadas por login de Discord.
  discordId?: string;
  // Presente en sesiones creadas por el login admin de usuario/contraseña.
  username?: string;
  // IDs de rol de Discord cacheados al momento del login (vacío para el
  // login de usuario/contraseña).
  roles: string[];
  // true si la cuenta tiene acceso al panel admin. Para sesiones de Discord
  // se recalcula en cada login contra ADMIN_DISCORD_IDS; proxy.ts revalida
  // esta misma env var antes de dejar pasar cualquier request a /admin.
  isAdmin: boolean;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Falta ADMIN_SESSION_SECRET en las variables de entorno. Ver .env.example."
    );
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of buf) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(str.length));
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Crea el valor de cookie firmado para una sesión recién autenticada. */
export async function createSessionToken(
  data: Omit<SessionPayload, "exp">
): Promise<string> {
  const payload: SessionPayload = {
    ...data,
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = toBase64Url(new TextEncoder().encode(payloadJson));

  const key = await getKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );

  return `${payloadB64}.${toBase64Url(signature)}`;
}

/** Verifica la cookie de sesión. Devuelve el payload si es válida, o null. */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payload: SessionPayload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64))
    );
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
