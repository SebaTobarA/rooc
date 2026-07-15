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

export async function editInteractionOriginal(
  interactionToken: string,
  body: { content?: string; embeds?: DiscordEmbed[]; components?: DiscordActionRow[] }
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API}/webhooks/${getApplicationId()}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    throw new Error(`No se pudo editar la respuesta de la interacción (${response.status}).`);
  }
}
