"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { postChannelMessage, editChannelMessage } from "@/lib/discord-bot";
import { buildPartyRosterEmbed, eventCategoryLabel } from "@/lib/discord-party-embed";
import { loadJobRoleEmojis } from "@/lib/discord-job-emojis";
import type { Player, Party } from "@/types/party";
import { readSnapshot, type PartyTemplateSnapshot } from "@/lib/party/template-snapshot";
import { DRAFT_EVENT_TYPES, readDraftOps, type DraftEventType, type DraftPayload } from "@/lib/party/draft-ops";
import { applyDraftOpsToDb, editorDisplayName, markDraftPublished } from "@/lib/party/draft";

// Canal de asistencia (mismo donde se publican los eventos) y rol "[SD]
// Core" a mencionar — fijos a pedido, no configurables desde el panel.
const PARTY_COMMS_CHANNEL_ID = "1519127820847026256";
const PARTY_COMMS_ROLE_ID = "1520562599903891526";

// PartyTemplateSnapshot / readSnapshot viven en @/lib/party/template-snapshot
// porque este archivo es "use server" y solo puede exportar funciones async.

export async function createPartyTemplate(
  event: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN",
  name: string,
  data: PartyTemplateSnapshot,
  eventId?: string
): Promise<{ id: string }> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para publicar plantillas de party.");
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  if (!user) throw new Error("Usuario no encontrado.");

  const template = await prisma.partyTemplate.create({
    data: {
      event,
      name: name.trim() || "Sin nombre",
      data: data as object,
      createdById: user.id,
      eventId: eventId ?? null,
    },
  });

  revalidatePath("/panel/party");
  return { id: template.id };
}

/**
 * Actualiza el nombre y la composición de una plantilla ya guardada, en vez
 * de crear una fila nueva en el historial — usado por "Guardar cambios"
 * cuando el builder se abrió desde "Editar" en saved-templates.tsx. No toca
 * communicatedAt/channelId/messageId: si la plantilla ya se había
 * comunicado, communicatePartyTemplate sigue editando el mismo mensaje de
 * Discord con la composición nueva en vez de publicar uno aparte.
 */
export async function updatePartyTemplate(
  id: string,
  name: string,
  data: PartyTemplateSnapshot
): Promise<{ id: string }> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para editar plantillas de party.");
  }

  const template = await prisma.partyTemplate.update({
    where: { id },
    data: { name: name.trim() || "Sin nombre", data: data as object },
  });

  revalidatePath("/panel/party");
  return { id: template.id };
}

export async function deletePartyTemplate(id: string) {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para borrar plantillas de party.");
  }

  await prisma.partyTemplate.delete({ where: { id } });
  revalidatePath("/panel/party");
}

/**
 * La plantilla más reciente de esa categoría, sin importar de qué Event de
 * Discord haya salido — se usa para el botón "Usar última composición
 * guardada" en Guild League: como Player.id es el discordId real (ver
 * src/lib/party/from-signups.ts), comparar sus jugadores contra los
 * inscritos de un evento nuevo alcanza para saber quién ya jugó antes.
 */
export async function findLatestTemplateForCategory(
  category: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN"
): Promise<{ id: string; players: Player[]; parties: Party[] } | null> {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) return null;

  const template = await prisma.partyTemplate.findFirst({
    where: { event: category },
    orderBy: { createdAt: "desc" },
  });
  if (!template) return null;

  const snapshot = readSnapshot(template.data);
  if (!snapshot) return null;

  return { id: template.id, ...snapshot };
}

/**
 * Publica el roster de la plantilla en un canal mencionando al rol [SD] Core
 * para que notifique de verdad (los embeds no generan ping, por eso la
 * mención va en `content`). Si ya se había publicado en ese mismo canal se
 * edita aquel mensaje; si se elige otro canal, o alguien borró el mensaje,
 * se publica uno nuevo. Mismo patrón que sendEvent/resendEvent en
 * src/lib/actions/events.ts.
 */
async function publishTemplateRoster(templateId: string, channelId: string): Promise<void> {
  const template = await prisma.partyTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { sourceEvent: true },
  });

  const snapshot = readSnapshot(template.data);
  if (!snapshot) {
    throw new Error("Esta plantilla tiene un formato viejo y no se puede comunicar — guárdala de nuevo.");
  }

  const label = eventCategoryLabel(template.event);
  const eventTitle = template.permanent ? "composición vigente" : (template.sourceEvent?.title ?? template.name);
  await loadJobRoleEmojis();
  const embed = buildPartyRosterEmbed(eventTitle, template.event, snapshot.players, snapshot.parties);
  const content = template.permanent
    ? `<@&${PARTY_COMMS_ROLE_ID}> se actualizó la composición de ${label}. También puedes ver tu party en el inicio del panel.`
    : `<@&${PARTY_COMMS_ROLE_ID}> te comunicamos que el roster para ${label} será el siguiente:`;

  if (template.channelId === channelId && template.messageId) {
    const edited = await editChannelMessage(channelId, template.messageId, { content, embeds: [embed] });
    if (edited) {
      await prisma.partyTemplate.update({ where: { id: templateId }, data: { communicatedAt: new Date() } });
      return;
    }
  }

  const message = await postChannelMessage(channelId, { content, embeds: [embed] });
  await prisma.partyTemplate.update({
    where: { id: templateId },
    data: { channelId, messageId: message.id, communicatedAt: new Date() },
  });
}

/**
 * Comunica una plantilla del historial a Discord: al canal donde ya se
 * publicó, o al de asistencia si es la primera vez.
 */
export async function communicatePartyTemplate(templateId: string): Promise<void> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para comunicar partys.");
  }

  const template = await prisma.partyTemplate.findUniqueOrThrow({ where: { id: templateId } });
  await publishTemplateRoster(templateId, template.channelId ?? PARTY_COMMS_CHANNEL_ID);
  revalidatePath("/panel/party");
}

/**
 * Guarda la composición permanente de un tipo de evento: no se ata a un día,
 * se va modificando según lo que necesite la guild. Hay una sola por tipo de
 * evento, así que si ya existe se actualiza. Con `notifyChannelId` además se
 * informa por Discord en ese canal; si eso falla la composición igual queda
 * guardada y se devuelve el motivo para mostrarlo. Con `draftVersion`, esa
 * versión del borrador compartido queda marcada como la publicada.
 */
export async function savePermanentComposition(
  category: "GUILD_LEAGUE" | "EMPERIUM_OVERRUN",
  data: PartyTemplateSnapshot,
  notifyChannelId: string | null,
  draftVersion?: number
): Promise<{ id: string; notifyError?: string }> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para guardar composiciones.");
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  if (!user) throw new Error("Usuario no encontrado.");

  const name = `Composición ${eventCategoryLabel(category)}`;
  const existing = await prisma.partyTemplate.findFirst({
    where: { event: category, permanent: true },
    orderBy: { updatedAt: "desc" },
  });
  const template = existing
    ? await prisma.partyTemplate.update({ where: { id: existing.id }, data: { name, data: data as object } })
    : await prisma.partyTemplate.create({
        data: { event: category, name, data: data as object, createdById: user.id, permanent: true },
      });
  if (typeof draftVersion === "number" && Number.isInteger(draftVersion)) {
    await markDraftPublished(category, draftVersion, user.globalName || user.username);
  }

  let notifyError: string | undefined;
  if (notifyChannelId) {
    try {
      await publishTemplateRoster(template.id, notifyChannelId);
    } catch (err) {
      notifyError = err instanceof Error ? err.message : "No se pudo informar por Discord.";
    }
  }

  revalidatePath("/panel/party");
  revalidatePath("/panel");
  return { id: template.id, notifyError };
}

/**
 * Aplica cambios del Party Builder al borrador compartido de ese tipo de
 * evento (ver src/lib/party/draft-ops.ts). Se llama sola a medida que se
 * edita; no revalida la página para no recargar el core en cada cambio: los
 * demás oficiales ven el cambio por la consulta periódica del borrador.
 */
export async function applyPartyDraftOps(
  category: DraftEventType,
  ops: unknown
): Promise<{ draft: DraftPayload; errors: string[] }> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para armar composiciones.");
  }
  if (!DRAFT_EVENT_TYPES.includes(category)) throw new Error("Tipo de evento inválido.");

  const parsed = readDraftOps(ops);
  return applyDraftOpsToDb(category, parsed, await editorDisplayName(session.discordId));
}
