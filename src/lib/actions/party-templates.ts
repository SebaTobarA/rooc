"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { postChannelMessage, editChannelMessage } from "@/lib/discord-bot";
import { buildPartyRosterEmbed, eventCategoryLabel } from "@/lib/discord-party-embed";
import type { Player, Party } from "@/types/party";
import { readSnapshot, type PartyTemplateSnapshot } from "@/lib/party/template-snapshot";

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
 * Publica (primera vez) o edita (siguientes veces) el roster de la
 * plantilla en el canal de asistencia, mencionando al rol para que
 * notifique de verdad — los embeds no generan ping, por eso la mención va
 * en `content`. Mismo patrón que sendEvent/resendEvent en
 * src/lib/actions/events.ts.
 */
export async function communicatePartyTemplate(templateId: string): Promise<void> {
  const session = await getSession();
  if (!session?.discordId) throw new Error("No autenticado.");

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) {
    throw new Error("Tu rol no tiene permiso para comunicar partys.");
  }

  const template = await prisma.partyTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { sourceEvent: true },
  });

  const snapshot = readSnapshot(template.data);
  if (!snapshot) {
    throw new Error("Esta plantilla tiene un formato viejo y no se puede comunicar — guárdala de nuevo.");
  }

  const eventTitle = template.sourceEvent?.title ?? template.name;
  const embed = buildPartyRosterEmbed(eventTitle, template.event, snapshot.players, snapshot.parties);
  const content = `<@&${PARTY_COMMS_ROLE_ID}> te comunicamos que el roster para ${eventCategoryLabel(template.event)} será el siguiente:`;

  if (template.channelId && template.messageId) {
    const edited = await editChannelMessage(template.channelId, template.messageId, { content, embeds: [embed] });
    if (!edited) {
      throw new Error("La comunicación anterior ya no existe en Discord — alguien borró ese mensaje.");
    }
    await prisma.partyTemplate.update({ where: { id: templateId }, data: { communicatedAt: new Date() } });
  } else {
    const message = await postChannelMessage(PARTY_COMMS_CHANNEL_ID, { content, embeds: [embed] });
    await prisma.partyTemplate.update({
      where: { id: templateId },
      data: { channelId: PARTY_COMMS_CHANNEL_ID, messageId: message.id, communicatedAt: new Date() },
    });
  }

  revalidatePath("/panel/party");
}
