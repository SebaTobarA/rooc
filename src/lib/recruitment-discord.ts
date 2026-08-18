import type { GuildApplication } from "@prisma/client";
import {
  postChannelMessage,
  editChannelMessage,
  type DiscordActionRow,
  type DiscordEmbed,
} from "@/lib/discord-bot";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { APPLICATION_SCREENSHOTS } from "@/lib/recruitment-screenshots";

/** Canal donde el bot publica cada postulación nueva para que la revisen. */
export const RECRUITMENT_CHANNEL_ID = "1538107784900509746";

/**
 * Roles que se otorgan al aprobar, según la guild elegida. Se dan con el bot,
 * así que su rol tiene que estar POR ENCIMA de estos dos en la jerarquía del
 * server, y el bot necesita el permiso "Gestionar roles".
 */
export const BRANCH_ROLE_IDS = {
  SD1: "1520562599903891526", // SD Core
  SD2: "1519123629638418514",
} as const;

export const BRANCH_LABELS = {
  SD1: "Special Delivery 1 (SD Core)",
  SD2: "Special Delivery 2",
} as const;

const COLOR_PENDING = 0xf5b942;
const COLOR_APPROVED = 0x3ba55d;
const COLOR_REJECTED = 0xed4245;

/**
 * Prefijo propio de los custom_id de reclutamiento, para no chocar con los de
 * eventos ("j"/"y"/"n"/...) ni con los de la encuesta de Core Guild ("cgs:").
 * Formato: rec:<accion>:<applicationId>
 */
export const RECRUITMENT_CUSTOM_ID_PREFIX = "rec:";

export type RecruitmentAction = "approve" | "reject" | "sd1" | "sd2" | "cancel";

export function buildRecruitmentCustomId(action: RecruitmentAction, applicationId: string): string {
  return `${RECRUITMENT_CUSTOM_ID_PREFIX}${action}:${applicationId}`;
}

export function parseRecruitmentCustomId(
  customId: string
): { action: RecruitmentAction; applicationId: string } | null {
  const parts = customId.split(":");
  if (parts.length !== 3 || parts[0] !== "rec") return null;
  return { action: parts[1] as RecruitmentAction, applicationId: parts[2] };
}

/**
 * Embeds del aviso. Discord permite hasta 10 embeds por mensaje y **cada uno
 * muestra una sola imagen**, así que se manda uno de resumen + uno por
 * captura (1 + 8 = 9). Poner las 8 en un solo embed no es posible; separarlas
 * además deja el título de cada captura pegado a su imagen.
 */
export function buildApplicationEmbeds(application: GuildApplication): DiscordEmbed[] {
  const avatar = discordAvatarUrl(application.discordId, application.discordAvatarHash, 64);

  const summary: DiscordEmbed = {
    title: "Nueva postulación",
    color: COLOR_PENDING,
    author: {
      name: `${application.characterName} — ${application.className}`,
      ...(avatar ? { icon_url: avatar } : {}),
    },
    fields: [
      { name: "Personaje", value: application.characterName, inline: true },
      { name: "Clase", value: application.className, inline: true },
      { name: "Nivel", value: application.levelText || "—", inline: true },
      { name: "Discord", value: `<@${application.discordId}>`, inline: true },
      { name: "Usuario", value: `@${application.discordUsername}`, inline: true },
      { name: "Disponibilidad", value: application.availability || "—", inline: true },
    ],
    timestamp: application.createdAt.toISOString(),
    footer: { text: "Revisa las capturas y decide abajo" },
  };

  if (application.aboutYou) {
    summary.fields!.push({
      name: "Sobre el postulante",
      // El límite de un field de embed son 1024 caracteres; aboutYou tiene
      // tope de 600 en el formulario, pero se recorta igual por las dudas.
      value: application.aboutYou.slice(0, 1024),
      inline: false,
    });
  }

  const shots = APPLICATION_SCREENSHOTS.filter((shot) => application[shot.field]).map(
    (shot): DiscordEmbed => ({
      title: shot.label,
      color: COLOR_PENDING,
      image: { url: application[shot.field] },
    })
  );

  return [summary, ...shots];
}

/** Botones iniciales: aprobar / rechazar. */
export function buildDecisionComponents(applicationId: string): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: "Se aprueba",
          custom_id: buildRecruitmentCustomId("approve", applicationId),
        },
        {
          type: 2,
          style: 4,
          label: "Se rechaza",
          custom_id: buildRecruitmentCustomId("reject", applicationId),
        },
      ],
    },
  ];
}

/** Segundo paso, tras aprobar: a qué guild entra. */
export function buildBranchComponents(applicationId: string): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: "SD1 (SD Core)",
          custom_id: buildRecruitmentCustomId("sd1", applicationId),
        },
        {
          type: 2,
          style: 1,
          label: "SD2",
          custom_id: buildRecruitmentCustomId("sd2", applicationId),
        },
        {
          type: 2,
          style: 2,
          label: "Cancelar",
          custom_id: buildRecruitmentCustomId("cancel", applicationId),
        },
      ],
    },
  ];
}

/**
 * Publica la postulación recién enviada en el canal de reclutamiento y
 * devuelve el id del mensaje, para poder editarlo cuando se decida.
 */
export async function publishApplication(application: GuildApplication): Promise<string> {
  const message = await postChannelMessage(RECRUITMENT_CHANNEL_ID, {
    embeds: buildApplicationEmbeds(application),
    components: buildDecisionComponents(application.id),
    // El resumen menciona al postulante con <@id> para que el oficial pueda
    // tocarlo; sin esto le llegaría un ping por cada postulación publicada.
    allowed_mentions: { parse: [] },
  });
  return message.id;
}

/**
 * Reemplaza el aviso por su versión resuelta: sin botones, con el color y el
 * texto del resultado. Las capturas se conservan para que el registro quede
 * completo en el canal.
 */
export async function markApplicationResolved(
  application: GuildApplication,
  outcome:
    | { kind: "approved"; branch: keyof typeof BRANCH_ROLE_IDS; byUserId: string }
    | { kind: "rejected"; byUserId: string },
  extraNote?: string
): Promise<void> {
  if (!application.discordMessageId) return;

  const embeds = buildApplicationEmbeds(application);
  const color = outcome.kind === "approved" ? COLOR_APPROVED : COLOR_REJECTED;

  embeds.forEach((embed) => {
    embed.color = color;
  });

  embeds[0].title =
    outcome.kind === "approved"
      ? `Postulación aprobada — ${BRANCH_LABELS[outcome.branch]}`
      : "Postulación rechazada";
  embeds[0].footer = {
    text: outcome.kind === "approved" ? "Aprobada" : "Rechazada",
  };
  embeds[0].fields!.push({
    name: "Resolución",
    value:
      (outcome.kind === "approved"
        ? `Aprobada por <@${outcome.byUserId}> — entra a **${BRANCH_LABELS[outcome.branch]}**`
        : `Rechazada por <@${outcome.byUserId}>`) + (extraNote ? `\n${extraNote}` : ""),
    inline: false,
  });

  // Si el aviso ya no está en Discord no hay nada que marcar como resuelto:
  // la resolución igual quedó guardada en la base, así que no se corta el
  // flujo por eso.
  await editChannelMessage(RECRUITMENT_CHANNEL_ID, application.discordMessageId, {
    embeds,
    components: [],
  });
}
