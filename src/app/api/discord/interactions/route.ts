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
import { handleCoreGuildSurveyComponent, handleCoreGuildSurveyModalSubmit } from "@/lib/core-guild/survey-interactions";
import { RECRUITMENT_CUSTOM_ID_PREFIX } from "@/lib/recruitment-discord";
import { handleRecruitmentComponent } from "@/lib/recruitment-interactions";

export const runtime = "nodejs";
export const maxDuration = 15;

type DiscordInteraction = {
  type: number;
  token: string;
  member?: {
    user: { id: string; username: string; global_name: string | null; avatar: string | null };
    nick: string | null;
    roles: string[];
  };
  data?: {
    custom_id: string;
    values?: string[];
    // Solo presente en interacciones type 5 (MODAL_SUBMIT).
    components?: { components: { custom_id: string; value: string }[] }[];
  };
};

function actorDisplayName(member: NonNullable<DiscordInteraction["member"]>): string {
  return member.nick ?? member.user.global_name ?? member.user.username;
}

async function findEventGuard(
  eventId: string
): Promise<{ signupsCloseAt: Date; allowedRoleIds: string[] } | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { signupsCloseAt: true, allowedRoleIds: true },
  });
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
    // La encuesta de organización de Core Guild usa un esquema de
    // custom_id ("cgs:...") totalmente separado del de eventos — se
    // resuelve aparte para no mezclar los dos parseCustomId.
    if (interaction.data.custom_id.startsWith("cgs:")) {
      return handleCoreGuildSurveyComponent({
        token: interaction.token,
        member: interaction.member,
        data: { custom_id: interaction.data.custom_id, values: interaction.data.values },
      });
    }
    // Igual que "cgs:": el aviso de reclutamiento usa su propio esquema de
    // custom_id ("rec:...") y no pasa por el parseCustomId de eventos.
    if (interaction.data.custom_id.startsWith(RECRUITMENT_CUSTOM_ID_PREFIX)) {
      return handleRecruitmentComponent({
        token: interaction.token,
        member: interaction.member,
        customId: interaction.data.custom_id,
      });
    }
    return handleComponent(interaction as Required<DiscordInteraction>);
  }

  if (interaction.type === 5 && interaction.data?.custom_id.startsWith("cgs:") && interaction.member && interaction.data.components) {
    return handleCoreGuildSurveyModalSubmit({
      token: interaction.token,
      member: interaction.member,
      data: { custom_id: interaction.data.custom_id, components: interaction.data.components },
    });
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

  // Único filtro de quién puede responder: los roles elegidos al enviar el
  // evento a Discord (ver sendEvent). Vacío solo en eventos publicados antes
  // de que existiera la pregunta — ahí responde cualquiera, como antes.
  const { allowedRoleIds } = guard;
  if (allowedRoleIds.length > 0 && !allowedRoleIds.some((roleId) => interaction.member.roles.includes(roleId))) {
    // Se nombran los roles con <@&id> (Discord los renderiza con su nombre
    // real) en vez de un "te falta el rol" genérico — si no, esto se
    // confunde con que las inscripciones estén cerradas.
    const mentions = allowedRoleIds.map((roleId) => `<@&${roleId}>`).join(", ");
    const content =
      allowedRoleIds.length === 1
        ? `Esta encuesta la responde quien tenga el rol ${mentions}. Pídeselo a un oficial y vuelve a intentarlo.`
        : `Esta encuesta la responde quien tenga alguno de estos roles: ${mentions}. Pídeselo a un oficial y vuelve a intentarlo.`;
    return Response.json({
      type: 4,
      data: { flags: 64, content, allowed_mentions: { parse: [] } },
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
              content: "Todavía no tienes una clase asignada en Discord — elige la tuya:",
              components: buildClassPickerComponents(eventId, listJobGuildRoles(guildRoles)),
            });
            return;
          }
          await editInteractionOriginal(token, {
            content: `¿Sigues siendo **${currentJob}**?`,
            components: buildConfirmComponents(eventId),
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
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
            await safeEdit(token, "No se encontró tu clase actual — intenta de nuevo desde \"Participar\".");
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
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
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
          content: "Elige tu clase actual:",
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
            content: `Listo ✅ Ahora eres ${className} y quedaste anotado.`,
            components: [],
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
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

    case "dl":
    case "dn": {
      // Modo DECLINE — Llegaré tarde / No asistiré: igual que "l"/"o" pero
      // en el roster donde por defecto todos participan (no hace falta
      // haber hecho "Participar" antes).
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
            status: action === "dl" ? "LATE" : "NOT_ATTENDING",
          });
          await renderAndPublishEmbed(eventId);
        } catch {
          // Igual que en "l"/"o": si falla, el próximo clic reintenta el
          // render completo, así que no hace falta avisar el error acá.
        }
      });
      return Response.json({ type: 6 });
    }

    case "dj": {
      // Modo DECLINE — "Cambiar de job": abre el selector de clases en un
      // mensaje efímero. Sincrónico: solo depende de la lista de roles
      // (cacheada 5 min), no de Prisma ni de escrituras a Discord.
      const guildRoles = await getGuildRolesCached();
      return Response.json({
        type: 4,
        data: {
          flags: 64,
          content: "Elige tu job — se cambia tu rol en Discord y la lista se actualiza sola:",
          components: buildClassPickerComponents(eventId, listJobGuildRoles(guildRoles), "q"),
        },
      });
    }

    case "q": {
      // Clase elegida desde "Cambiar de job": cambia el rol en Discord (y
      // por lo tanto la columna en la que aparece en el roster) sin tocar
      // su asistencia — a diferencia de "p", acá no se anota a nadie.
      after(async () => {
        try {
          if (!roleId) throw new Error("Falta la clase elegida.");
          const result = await swapMemberJobClass(actorId, roleId);
          if (result.error || !result.roleIds) {
            await safeEdit(token, result.error ?? "No se pudo cambiar tu clase en Discord.");
            return;
          }
          await prisma.user.updateMany({ where: { discordId: actorId }, data: { roles: result.roleIds } });

          // El nombre de la clase queda guardado también en el signup si ya
          // había avisado algo (tarde/no voy), para que el panel no siga
          // mostrando la clase vieja.
          const guildRoles = await getGuildRolesCached();
          const target = listJobGuildRoles(guildRoles).find((role) => role.id === roleId);
          const className = target?.name ?? "Clase desconocida";
          await prisma.eventSignup.updateMany({
            where: { eventId, discordId: actorId },
            data: { className, classRoleId: roleId },
          });

          await renderAndPublishEmbed(eventId);
          await editInteractionOriginal(token, {
            content: `Listo ✅ Ahora eres **${className}**.`,
            components: [],
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
        }
      });
      return Response.json({ type: 5, data: { flags: 64 } });
    }

    case "dy": {
      // Modo DECLINE — Voy a tiempo: deshace un aviso anterior de "llego
      // tarde"/"no asisto", volviendo al estado por defecto (participa sin
      // necesidad de ningún registro en EventSignup).
      after(async () => {
        try {
          await prisma.eventSignup.deleteMany({ where: { eventId, discordId: actorId } });
          await renderAndPublishEmbed(eventId);
        } catch {
          // Igual que en "l"/"o": si falla, el próximo clic reintenta el
          // render completo, así que no hace falta avisar el error acá.
        }
      });
      return Response.json({ type: 6 });
    }

    default:
      return Response.json({ type: 4, data: { flags: 64, content: "Acción no reconocida." } });
  }
}
