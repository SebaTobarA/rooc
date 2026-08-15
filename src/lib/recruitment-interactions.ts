/**
 * Clics de los botones del aviso de reclutamiento (Se aprueba / Se rechaza →
 * SD1 / SD2). Vive aparte del despacho de eventos porque usa su propio
 * esquema de custom_id ("rec:...") — igual que la encuesta de Core Guild.
 *
 * Misma mecánica que el resto de interacciones: ack inmediato (Discord corta
 * a los 3 segundos) y el trabajo real dentro de after().
 */

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { addGuildMemberRole } from "@/lib/discord-bot";
import { editInteractionOriginal } from "@/lib/discord-interaction-webhook";
import { getEffectivePermissions } from "@/lib/permissions";
import { isOwnerId } from "@/lib/discord-auth";
import {
  BRANCH_LABELS,
  BRANCH_ROLE_IDS,
  buildBranchComponents,
  markApplicationResolved,
  parseRecruitmentCustomId,
} from "@/lib/recruitment-discord";

type InteractionMember = {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
  roles: string[];
};

const REJECT_NOTE =
  "Gracias por postular a Special Delivery. Por ahora no vamos a avanzar con tu postulación.";

async function safeEdit(token: string, content: string) {
  try {
    await editInteractionOriginal(token, { content, components: [] });
  } catch {
    // Si ni esto sale, el error ya quedó en los logs de la función.
  }
}

/**
 * Solo Guild Leader / Vice / Oficiales (los que tienen canManageRecruitment),
 * más los dueños del sitio. El canal puede estar abierto a más gente, así que
 * el permiso se revisa acá y no se asume por dónde está el botón.
 *
 * Los roles se toman de la interacción (`member.roles`), que Discord manda al
 * día — no de la sesión web, que acá no existe.
 */
async function canDecide(member: InteractionMember): Promise<boolean> {
  const isAdmin = isOwnerId(member.user.id);
  if (isAdmin) return true;

  const permissions = await getEffectivePermissions({
    discordId: member.user.id,
    roles: member.roles,
    isAdmin: false,
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  return permissions.canManageRecruitment;
}

export async function handleRecruitmentComponent({
  token,
  member,
  customId,
}: {
  token: string;
  member: InteractionMember;
  customId: string;
}): Promise<Response> {
  const parsed = parseRecruitmentCustomId(customId);
  if (!parsed) {
    return Response.json({ type: 4, data: { flags: 64, content: "Acción no reconocida." } });
  }

  const { action, applicationId } = parsed;
  const actorId = member.user.id;

  if (!(await canDecide(member))) {
    return Response.json({
      type: 4,
      data: { flags: 64, content: "Tu rol no tiene permiso para revisar postulaciones." },
    });
  }

  const application = await prisma.guildApplication.findUnique({ where: { id: applicationId } });
  if (!application) {
    return Response.json({
      type: 4,
      data: { flags: 64, content: "Esta postulación ya no existe." },
    });
  }

  // Evita que dos oficiales decidan lo mismo dos veces (o cosas distintas)
  // si los dos tenían el mensaje abierto.
  if (application.status !== "PENDING" && action !== "cancel") {
    return Response.json({
      type: 4,
      data: {
        flags: 64,
        content: `Esta postulación ya fue resuelta${
          application.reviewedByUsername ? ` por @${application.reviewedByUsername}` : ""
        }.`,
      },
    });
  }

  switch (action) {
    case "approve": {
      // Aprobar no cierra nada todavía: falta elegir la guild. Se pregunta en
      // un mensaje efímero para no ensuciar el canal con pasos intermedios.
      return Response.json({
        type: 4,
        data: {
          flags: 64,
          content: `¿A qué guild entra **${application.characterName}**?`,
          components: buildBranchComponents(applicationId),
        },
      });
    }

    case "cancel": {
      return Response.json({
        type: 7,
        data: { content: "Listo, no se hizo nada.", components: [] },
      });
    }

    case "sd1":
    case "sd2": {
      const branch = action === "sd1" ? "SD1" : "SD2";
      after(async () => {
        try {
          let roleNote = "";
          try {
            await addGuildMemberRole(application.discordId, BRANCH_ROLE_IDS[branch]);
          } catch {
            // La postulación igual queda aprobada: es peor perder la decisión
            // que quedarse sin el rol, que un oficial puede dar a mano.
            roleNote = `No se pudo asignar el rol <@&${BRANCH_ROLE_IDS[branch]}> automáticamente — dáselo a mano.`;
          }

          const updated = await prisma.guildApplication.update({
            where: { id: applicationId },
            data: {
              status: "APPROVED",
              branch,
              reviewNote: "",
              reviewedByDiscordId: actorId,
              reviewedByUsername: member.nick ?? member.user.global_name ?? member.user.username,
              reviewedAt: new Date(),
            },
          });

          await markApplicationResolved(
            updated,
            { kind: "approved", branch, byUserId: actorId },
            roleNote
          );

          await editInteractionOriginal(token, {
            content: roleNote
              ? `Aprobada para ${BRANCH_LABELS[branch]}. ⚠️ ${roleNote}`
              : `Listo ✅ ${application.characterName} entra a ${BRANCH_LABELS[branch]} y ya tiene su rol.`,
            components: [],
          });
        } catch (err) {
          await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
        }
      });
      return Response.json({ type: 5, data: { flags: 64 } });
    }

    case "reject": {
      after(async () => {
        try {
          const updated = await prisma.guildApplication.update({
            where: { id: applicationId },
            data: {
              status: "REJECTED",
              reviewNote: REJECT_NOTE,
              reviewedByDiscordId: actorId,
              reviewedByUsername: member.nick ?? member.user.global_name ?? member.user.username,
              reviewedAt: new Date(),
            },
          });
          await markApplicationResolved(updated, { kind: "rejected", byUserId: actorId });
        } catch {
          // El mensaje del canal queda como estaba; otro clic reintenta.
        }
      });
      return Response.json({
        type: 4,
        data: { flags: 64, content: "Postulación rechazada." },
      });
    }

    default:
      return Response.json({ type: 4, data: { flags: 64, content: "Acción no reconocida." } });
  }
}
