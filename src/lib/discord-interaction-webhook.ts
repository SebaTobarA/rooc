/**
 * Edita la respuesta diferida de una interacción de Discord (botón). Se
 * autentica con el token propio de la interacción (va en la URL), no con
 * DISCORD_BOT_TOKEN — por eso vive separado de discord-bot.ts, que solo hace
 * llamadas autenticadas como bot.
 */

import type { DiscordActionRow, DiscordEmbed } from "@/lib/discord-bot";

const DISCORD_API = "https://discord.com/api/v10";

function getApplicationId(): string {
  // El "application id" de Discord es el mismo valor que el client_id de
  // OAuth2 — ya configurado para el login con Discord.
  const id = process.env.DISCORD_CLIENT_ID;
  if (!id) throw new Error("Falta DISCORD_CLIENT_ID en las variables de entorno.");
  return id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function editInteractionOriginal(
  interactionToken: string,
  body: { content?: string; embeds?: DiscordEmbed[]; components?: DiscordActionRow[] }
): Promise<void> {
  const url = `${DISCORD_API}/webhooks/${getApplicationId()}/${interactionToken}/messages/@original`;

  // Justo después de reconocer la interacción (type 5/6) puede pasar que
  // Discord todavía no haya terminado de registrar el mensaje diferido del
  // lado de ellos — el primer intento de editarlo devuelve 404 aunque el
  // token sea válido. Se reintenta un par de veces con una espera corta en
  // vez de fallar directo; cualquier otro código de error no se reintenta.
  const delaysMs = [0, 400, 900];

  let lastStatus = 0;
  for (const delay of delaysMs) {
    if (delay > 0) await sleep(delay);

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return;
    lastStatus = response.status;
    if (response.status !== 404) break;
  }

  throw new Error(`No se pudo editar la respuesta de la interacción (${lastStatus}).`);
}
