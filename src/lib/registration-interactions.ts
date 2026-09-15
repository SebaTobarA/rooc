/**
 * Botón y modal del mensaje de registro ("reg:..."). Vive aparte del
 * despacho de eventos igual que la encuesta de Core Guild y reclutamiento.
 *
 * El botón responde el modal de forma sincrónica: un modal (type 9) solo
 * puede ser la respuesta inicial, no se puede diferir con after(). El envío
 * sí se reconoce al instante y hace el trabajo real (roles, apodo, Prisma)
 * dentro de after().
 */

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  addGuildMemberRole,
  getGuildRoles,
  getGuildRolesCached,
  removeGuildMemberRole,
  setGuildMemberNickname,
  type DiscordModalSubmitComponent,
} from "@/lib/discord-bot";
import { JOB_ROLE_EMOJI, jobGuildRoleIds, listJobGuildRoles } from "@/lib/discord-job-roles";
import { editInteractionOriginal } from "@/lib/discord-interaction-webhook";
import {
  PILOT_SUFFIX,
  REGISTRATION_ACCESS_ROLE_ID,
  REGISTRATION_OPEN_ID,
  buildRegistrationModal,
  parseRegistrationSubmit,
  stripPilotSuffix,
} from "@/lib/registration-discord";

type InteractionMember = {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
  roles: string[];
};

async function safeEdit(token: string, content: string) {
  try {
    await editInteractionOriginal(token, { content, components: [] });
  } catch {
    // Si ni esto sale, el error ya quedó en los logs de la función.
  }
}

export async function handleRegistrationComponent({
  member,
  customId,
}: {
  member: InteractionMember;
  customId: string;
}): Promise<Response> {
  if (customId !== REGISTRATION_OPEN_ID) {
    return Response.json({ type: 4, data: { flags: 64, content: "Acción no reconocida." } });
  }

  const [guildRoles, registration] = await Promise.all([
    getGuildRolesCached(),
    prisma.memberRegistration.findUnique({
      where: { discordId: member.user.id },
      select: { jobRoleId: true, nickname: true, isPilot: true },
    }),
  ]);
  const jobRoles = listJobGuildRoles(guildRoles);
  if (jobRoles.length === 0) {
    return Response.json({
      type: 4,
      data: { flags: 64, content: "Todavía no hay roles de job creados en el server. Avísale a un oficial." },
    });
  }

  // Precarga para "Actualizar datos". Un Pilot no tiene rol de job, así que
  // su job sale de lo guardado; el resto, del rol que tiene hoy en Discord.
  const jobIds = new Set(jobRoles.map((role) => role.id));
  const currentJobRoleId = member.roles.find((id) => jobIds.has(id)) ?? registration?.jobRoleId ?? null;
  const nickname = registration?.nickname ?? (member.nick ? stripPilotSuffix(member.nick) : "");

  return Response.json({
    type: 9,
    data: buildRegistrationModal(jobRoles, {
      jobRoleId: currentJobRoleId,
      nickname,
      isPilot: registration?.isPilot ?? false,
    }),
  });
}

export async function handleRegistrationModalSubmit({
  token,
  member,
  components,
}: {
  token: string;
  member: InteractionMember;
  components: DiscordModalSubmitComponent[];
}): Promise<Response> {
  const submitted = parseRegistrationSubmit(components);
  if (!submitted) {
    return Response.json({
      type: 4,
      data: { flags: 64, content: "Faltan datos del formulario. Vuelve a intentarlo desde el mensaje de registro." },
    });
  }

  const { jobRoleId, nickname, isPilot } = submitted;
  const discordId = member.user.id;

  after(async () => {
    try {
      const guildRoles = await getGuildRoles();
      const job = listJobGuildRoles(guildRoles).find((role) => role.id === jobRoleId);
      if (!job) {
        await safeEdit(token, "Ese job ya no existe como rol en el server. Vuelve a intentarlo desde el mensaje de registro.");
        return;
      }

      // Un Pilot queda sin rol de job a propósito: los rosters de eventos y
      // el Party Builder arman las columnas por ese rol, y la cuenta que
      // pilotea ya tiene su propio lugar.
      const jobIds = jobGuildRoleIds(guildRoles);
      const rolesToRemove = member.roles.filter((id) => jobIds.has(id) && (isPilot || id !== job.id));
      for (const id of rolesToRemove) await removeGuildMemberRole(discordId, id);
      if (!isPilot && !member.roles.includes(job.id)) await addGuildMemberRole(discordId, job.id);
      if (!member.roles.includes(REGISTRATION_ACCESS_ROLE_ID)) {
        await addGuildMemberRole(discordId, REGISTRATION_ACCESS_ROLE_ID);
      }

      const roleIds = [
        ...new Set([
          ...member.roles.filter((id) => !rolesToRemove.includes(id)),
          ...(isPilot ? [] : [job.id]),
          REGISTRATION_ACCESS_ROLE_ID,
        ]),
      ];

      await prisma.memberRegistration.upsert({
        where: { discordId },
        create: { discordId, discordUsername: member.user.username, nickname, jobRoleId: job.id, jobName: job.name, isPilot },
        update: { discordUsername: member.user.username, nickname, jobRoleId: job.id, jobName: job.name, isPilot },
      });
      // Mismo cache de roles que usan /panel/perfil y los permisos del panel.
      await prisma.user.updateMany({ where: { discordId }, data: { roles: roleIds } });

      // El apodo va al final: si falla (dueño del server, rol por encima del
      // de Boo o falta "Gestionar apodos") los roles ya quedaron asignados y
      // solo se avisa que lo cambie a mano.
      const desiredNick = isPilot ? `${nickname}${PILOT_SUFFIX}` : nickname;
      const nickError = member.nick === desiredNick ? null : await setGuildMemberNickname(discordId, desiredNick);

      const emoji = JOB_ROLE_EMOJI[job.name] ? `${JOB_ROLE_EMOJI[job.name]} ` : "";
      const lines = [
        isPilot
          ? `Listo ✅ Quedaste registrado como **${desiredNick}**, Pilot/Joki de ${emoji}${job.name}. Tienes acceso a los canales, sin lugar en los rosters.`
          : `Listo ✅ Quedaste registrado como **${nickname}** (${emoji}${job.name}). Ya tienes acceso a los canales del server.`,
      ];
      if (nickError) lines.push(nickError);
      await editInteractionOriginal(token, { content: lines.join("\n"), components: [] });
    } catch (err) {
      await safeEdit(token, err instanceof Error ? err.message : "Ocurrió un error, intenta de nuevo.");
    }
  });

  return Response.json({ type: 5, data: { flags: 64 } });
}
