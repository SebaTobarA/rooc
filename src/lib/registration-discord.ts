/**
 * Mensaje fijo de registro del server, al estilo del de Nostra: quien entra
 * toca "Registrarme / Actualizar datos", Boo abre un modal con job, nick
 * in-game y tipo de registro, y al enviarlo le asigna roles y apodo (ver
 * registration-interactions.ts). Registrarse no es entrar a la guild — eso
 * sigue pasando por /panel/postulacion.
 */

import { prisma } from "@/lib/prisma";
import {
  deleteChannelMessage,
  editChannelMessage,
  postChannelMessage,
  type DiscordActionRow,
  type DiscordEmbed,
  type DiscordModal,
  type DiscordModalSubmitComponent,
} from "@/lib/discord-bot";
import { JOB_ROLE_EMOJI } from "@/lib/discord-job-roles";

/** Pronterian@s: el rol de comunidad que desbloquea los canales públicos. */
export const REGISTRATION_ACCESS_ROLE_ID = "1519123629638418514";

/**
 * Prefijo propio de los custom_id de registro, para no chocar con los de
 * eventos, la encuesta de Core Guild ("cgs:") ni reclutamiento ("rec:").
 */
export const REGISTRATION_CUSTOM_ID_PREFIX = "reg:";
export const REGISTRATION_OPEN_ID = "reg:open";
export const REGISTRATION_MODAL_ID = "reg:submit";

const FIELD_JOB = "job";
const FIELD_NICKNAME = "nickname";
const FIELD_TYPE = "type";

export const PILOT_SUFFIX = " [Pilot]";
// Discord corta los apodos en 32 caracteres: se reserva lugar para el sufijo
// para que el nick de un Pilot nunca quede truncado.
export const NICKNAME_MAX_LENGTH = 32 - PILOT_SUFFIX.length;

const COLOR_REGISTRATION = 0x7cc4f0;

export function stripPilotSuffix(nick: string): string {
  return nick.endsWith(PILOT_SUFFIX) ? nick.slice(0, -PILOT_SUFFIX.length) : nick;
}

function parseCustomEmoji(markup: string | undefined): { id: string; name: string } | undefined {
  const match = markup?.match(/^<a?:(\w+):(\d+)>$/);
  return match ? { name: match[1], id: match[2] } : undefined;
}

export function buildRegistrationEmbed(): DiscordEmbed {
  return {
    title: "Registro",
    color: COLOR_REGISTRATION,
    description:
      "**Registra tu nick in-game y tu job para que sepamos tu clase y se desbloqueen los canales del server.**\n" +
      "Esto no es una invitación a la guild: solo guarda tu clase y te da acceso a los canales. " +
      "La membresía de la guild se gestiona aparte.\n" +
      "¿Cambiaste de job o de nick in-game? Actualízalo aquí cuando quieras.",
    fields: [
      {
        name: "Tu personaje",
        value: "Elige tu job y escribe tu nick in-game para acceder a los canales públicos.",
      },
      {
        name: "Pilot/Joki",
        value:
          "¿Juegas la cuenta de otro miembro? Elige \"Pilot/Joki\" en el tipo de registro: tendrás acceso a " +
          "los canales, pero sin ocupar un lugar en los rosters (así el conteo de personajes activos queda correcto).",
      },
    ],
  };
}

export function buildRegistrationComponents(): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [{ type: 2, style: 1, label: "Registrarme / Actualizar datos", custom_id: REGISTRATION_OPEN_ID }],
    },
  ];
}

export function buildRegistrationModal(
  jobRoles: { id: string; name: string }[],
  current: { jobRoleId: string | null; nickname: string; isPilot: boolean }
): DiscordModal {
  return {
    custom_id: REGISTRATION_MODAL_ID,
    title: "Registro",
    components: [
      {
        type: 18,
        label: "Job",
        component: {
          type: 3,
          custom_id: FIELD_JOB,
          placeholder: "Elige tu job…",
          required: true,
          options: jobRoles.map((role) => ({
            label: role.name,
            value: role.id,
            emoji: parseCustomEmoji(JOB_ROLE_EMOJI[role.name]),
            default: role.id === current.jobRoleId,
          })),
        },
      },
      {
        type: 18,
        label: "Nick in-game",
        component: {
          type: 4,
          custom_id: FIELD_NICKNAME,
          style: 1,
          required: true,
          max_length: NICKNAME_MAX_LENGTH,
          placeholder: "Escribe tu nick in-game",
          ...(current.nickname ? { value: current.nickname.slice(0, NICKNAME_MAX_LENGTH) } : {}),
        },
      },
      {
        type: 18,
        label: "Tipo de registro",
        description: "Pilot/Joki = juegas la cuenta de un miembro (acceso a canales, sin lugar en rosters)",
        component: {
          type: 3,
          custom_id: FIELD_TYPE,
          required: true,
          options: [
            { label: "Mi propia cuenta", value: "member", default: !current.isPilot },
            { label: "Pilot/Joki", value: "pilot", default: current.isPilot },
          ],
        },
      },
    ],
  };
}

/**
 * Lee el envío del modal. Los campos llegan envueltos en Label (type 18,
 * con `component`); se aceptan también filas clásicas (type 1, con
 * `components`) por si Discord cambia la forma de devolverlos.
 */
export function parseRegistrationSubmit(
  components: DiscordModalSubmitComponent[]
): { jobRoleId: string; nickname: string; isPilot: boolean } | null {
  const fields = new Map<string, { value?: string; values?: string[] }>();
  for (const item of components) {
    for (const field of item.component ? [item.component] : (item.components ?? [])) {
      fields.set(field.custom_id, field);
    }
  }

  const jobRoleId = fields.get(FIELD_JOB)?.values?.[0];
  const nickname = fields.get(FIELD_NICKNAME)?.value?.trim().slice(0, NICKNAME_MAX_LENGTH);
  const type = fields.get(FIELD_TYPE)?.values?.[0];
  if (!jobRoleId || !nickname || !type) return null;
  return { jobRoleId, nickname, isPilot: type === "pilot" };
}

/**
 * Publica el mensaje de registro, o lo edita en el lugar si ya estaba en ese
 * canal. Si se elige otro canal se borra el anterior, para que no quede un
 * botón duplicado en el viejo.
 */
export async function publishRegistrationMessage(channelId: string): Promise<void> {
  const settings = await prisma.registrationSettings.findFirst();
  const body = { embeds: [buildRegistrationEmbed()], components: buildRegistrationComponents() };

  if (settings?.channelId && settings.messageId) {
    if (settings.channelId === channelId) {
      if (await editChannelMessage(channelId, settings.messageId, body)) return;
      // Lo borraron a mano en Discord: se publica de nuevo abajo.
    } else {
      await deleteChannelMessage(settings.channelId, settings.messageId);
    }
  }

  const message = await postChannelMessage(channelId, body);
  if (settings) {
    await prisma.registrationSettings.update({
      where: { id: settings.id },
      data: { channelId, messageId: message.id },
    });
  } else {
    await prisma.registrationSettings.create({ data: { channelId, messageId: message.id } });
  }
}
