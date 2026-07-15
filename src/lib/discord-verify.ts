/**
 * Verifica la firma Ed25519 que Discord manda en cada request al endpoint de
 * interacciones (botones, PING de validación). Sin esto, cualquiera podría
 * postear a /api/discord/interactions haciéndose pasar por Discord.
 *
 * DISCORD_PUBLIC_KEY sale de Developer Portal → General Information →
 * "Public Key" (no confundir con DISCORD_CLIENT_SECRET ni DISCORD_BOT_TOKEN).
 */

import nacl from "tweetnacl";

function getPublicKey(): string {
  const key = process.env.DISCORD_PUBLIC_KEY;
  if (!key) throw new Error("Falta DISCORD_PUBLIC_KEY en las variables de entorno.");
  return key;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) return false;
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + rawBody),
      hexToBytes(signature),
      hexToBytes(getPublicKey())
    );
  } catch {
    return false;
  }
}
