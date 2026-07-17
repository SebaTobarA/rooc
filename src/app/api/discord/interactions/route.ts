/**
 * Recibe los clics de botones del roster de eventos (Participar/Llego
 * tarde/No alcanzo/Sí/No/elegir clase) posteados directamente por Discord —
 * no por el navegador, por eso se verifica por firma Ed25519 en vez de la
 * cookie de sesión (ver src/lib/discord-verify.ts). No queda cubierta por
 * el matcher de src/proxy.ts a propósito.
 *
 * Discord exige una respuesta inicial en 3 segundos; el trabajo real
 * (Prisma + REST a Discord) puede tardar más, así que cada rama devuelve un
 * ack inmediato y hace el resto dentro de after(), después editando la
 * respuesta de la interacción vía su propio token (ver
 * discord-interaction-webhook.ts).
 */

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDiscordRequest } from "@/lib/discord-verify";
import { editInteractionOriginal } from "@/lib/discord-interaction-webhook";
import { getGuildRolesCached } from "@/lib/discord-bot";
import { jobGuildRoleIds, listJobGuildRoles, resolveJobFromRoles } from "@/lib/discord-job-roles";
import { swapMemberJobClass } from "@/lib/discord-role-swap";
import { renderAndPublishEmbed, upsertEventSignup } from "@/lib/events";
import { buildClassPickerComponents, buildConfirmComponents, parseCustomId } from "@/lib/discord-event-embed";

export const runtime = "nodejs";
export const maxDuration = 15;

type DiscordInteraction = {
  type: number;
  token: string;
  member?: {
    user: { id: string; username: string; global_name: string | null };
    nick: string | null;
    roles: string[];
  };
  data?: { custom_id: string };
};

function actorDisplayName(member: NonNullable<DiscordInteraction["member"]>): string {
  return member.nick ?? member.user.global_name ?? member.user.username;
}

async function findEventGuard(eventId: string): Promise<{ signupsCloseAt: Date } | null> {
  return prisma.event.findUnique({ where: { id: eventId }, select: { signupsCloseAt: true } });
}

async function safeEdit(token: string, content: string) {
  try {
    await editInteractionOriginal(token, { content, components: [] });
  } catch {
    // Si ni siquiera esto funciona no queda mucho más por hacer — el error
    // ya habrá quedado en los logs de la función.
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");

  if (!verifyDiscordRequest(rawBody, signature, timestamp)) {
    return new Response("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as DiscordInteraction;

  if (interaction.type === 1) {
    return Response.json({ type: 1 }); // PING de validación del endpoint
  }

  if (interaction.type === 3 && interaction.data && interaction.member) {
    return handleComponent(interaction as Required<DiscordInteraction>);
  }

  return new Response("unsupported interaction type", { status: 400 });
}

async function handleComponent(interaction: Required<DiscordInteraction>) {
  const { action, eventId, roleId } = parseCustomId(interaction.data.custom_id);
  const actorId = interaction.member.user.id;
  const displayName = actorDisplayName(interaction.member);
  const token = interaction.token;

  const guard = await findEventGuard(eventId);
  if (!guard) {
    return Response.json({
      type: 4,
      data: { flags: 64, content: "Este evento ya no está disponible." },
    });
  }
  if (guard.signupsCloseAt.getTime() < Date.now()) {
    return Response.json({
      type: 4,
      data: { flags: 64, content: "Las inscripciones para este evento ya cerraron." },
    });
  }

  switch (action) {
    case "j": {
      // Participar: confirmar la clase actual, o mandar directo al selector
      // si todavía no tiene ninguna de las 13 asignada en Discord.
      after(async () => {
        try {
          const guildRoles = await getGuildRolesCached();
          const currentJob = resolveJobFromRoles(interaction.member.roles, guildRoles);
          if (!currentJob) {
            await editInteractionOriginal(token, {
              content: "Todavía no tenés una clase asignada en Discord — elegí la tuya:",
              components: buildClassPickerComponents(eventId, listJobGuildRoles(guildRoles)),
            });
            return;
          }
          await editInteractionOriginal(token, {
            content: `¿Seguís siendo **${currentJob}**?`,
            components: buildConfirmComponents(eventId),
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, probá de nuevo.");
        }
      });
      return Response.json({ type: 5, data: { flags: 64 } });
    }

    case "y": {
      // Sí: se re-resuelve la clase en vivo (nunca se confía en nada
      // encodeado en el botón) y se anota en esa columna.
      after(async () => {
        try {
          const guildRoles = await getGuildRolesCached();
          const jobRoles = listJobGuildRoles(guildRoles);
          const jobIds = jobGuildRoleIds(guildRoles);
          const currentRoleId = interaction.member.roles.find((id) => jobIds.has(id));
          const currentJob = jobRoles.find((role) => role.id === currentRoleId);
          if (!currentJob) {
            await safeEdit(token, "No se encontró tu clase actual — probá de nuevo desde \"Participar\".");
            return;
          }
          await upsertEventSignup(eventId, actorId, {
            displayName,
            className: currentJob.name,
            classRoleId: currentJob.id,
            status: "CONFIRMED",
          });
          await renderAndPublishEmbed(eventId);
          await editInteractionOriginal(token, { content: `Listo ✅ Anotado como ${currentJob.name}.`, components: [] });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, probá de nuevo.");
        }
      });
      return Response.json({ type: 6 });
    }

    case "n": {
      // No: se responde sincrónico, solo depende de la lista de roles
      // (cacheada 5 min), no de Prisma ni de escrituras a Discord.
      const guildRoles = await getGuildRolesCached();
      return Response.json({
        type: 7,
        data: {
          content: "Elegí tu clase actual:",
          components: buildClassPickerComponents(eventId, listJobGuildRoles(guildRoles)),
        },
      });
    }

    case "p": {
      // Elegir clase: cambia el rol en Discord (y por lo tanto en
      // /panel/perfil, que lee del mismo User.roles) y anota el signup.
      after(async () => {
        try {
          if (!roleId) throw new Error("Falta la clase elegida.");
          const result = await swapMemberJobClass(actorId, roleId);
          if (result.error || !result.roleIds) {
            await safeEdit(token, result.error ?? "No se pudo cambiar tu clase en Discord.");
            return;
          }
          await prisma.user.updateMany({
            where: { discordId: actorId },
            data: { roles: result.roleIds },
          });

          const guildRoles = await getGuildRolesCached();
          const target = listJobGuildRoles(guildRoles).find((role) => role.id === roleId);
          const className = target?.name ?? "Clase desconocida";
          await upsertEventSignup(eventId, actorId, {
            displayName,
            className,
            classRoleId: roleId,
            status: "CONFIRMED",
          });
          await renderAndPublishEmbed(eventId);
          await editInteractionOriginal(token, {
            content: `Listo ✅ Ahora sos ${className} y quedaste anotado.`,
            components: [],
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, probá de nuevo.");
        }
      });
      return Response.json({ type: 6 });
    }

    case "l":
    case "o": {
      // Llego tarde / No alcanzo: el botón está en el propio roster, así
      // que la respuesta diferida ya ES la edición del mensaje original.
      after(async () => {
        try {
          const guildRoles = await getGuildRolesCached();
          const currentJob = resolveJobFromRoles(interaction.member.roles, guildRoles);
          const jobRoles = listJobGuildRoles(guildRoles);
          const target = currentJob ? jobRoles.find((role) => role.name === currentJob) : undefined;
          await upsertEventSignup(eventId, actorId, {
            displayName,
            className: target?.name ?? "Sin clase",
            classRoleId: target?.id ?? "",
            status: action === "l" ? "LATE" : "NOT_ATTENDING",
          });
          await renderAndPublishEmbed(eventId);
        } catch {
          // El mensaje ya quedó en estado "actualizando" — si falla, el
          // próximo click (de cualquier persona) va a volver a intentar el
          // render completo, así que no hace falta un mensaje de error acá.
        }
      });
      return Response.json({ type: 6 });
    }

    default:
      return Response.json({ type: 4, data: { flags: 64, content: "Acción no reconocida." } });
  }
}
