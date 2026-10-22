/**
 * Borrador compartido del Party Builder en la base (PartyDraft) y presencia
 * de quién lo está editando (PartyDraftEditor). Solo servidor: lo usan la
 * página, la ruta de consulta (src/app/panel/party/draft/route.ts) y las
 * acciones de src/lib/actions/party-templates.ts.
 */

import "server-only";
import type { PartyDraft } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readSnapshot } from "@/lib/party/template-snapshot";
import {
  applyDraftOp,
  boardFromSnapshot,
  emptyBoard,
  readBoard,
  type DraftEditor,
  type DraftEventType,
  type DraftOp,
  type DraftPayload,
} from "@/lib/party/draft-ops";

// Cuánto se considera que alguien sigue con la página abierta desde su
// última consulta (el cliente consulta cada ~2,5 s con la pestaña visible).
const PRESENCE_WINDOW_MS = 15_000;
const MAX_WRITE_ATTEMPTS = 8;

function toPayload(row: PartyDraft): DraftPayload {
  return {
    version: row.version,
    publishedVersion: row.publishedVersion,
    board: readBoard(row.board) ?? emptyBoard(),
    updatedByName: row.updatedByName,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedByName: row.publishedByName,
  };
}

/**
 * El borrador de ese tipo de evento. La primera vez se crea a partir de la
 * composición publicada, así que arranca sin cambios pendientes.
 */
async function ensureDraft(event: DraftEventType): Promise<PartyDraft> {
  const existing = await prisma.partyDraft.findUnique({ where: { event } });
  if (existing) return existing;

  const published = await prisma.partyTemplate.findFirst({
    where: { event, permanent: true },
    orderBy: { updatedAt: "desc" },
  });
  const snapshot = published ? readSnapshot(published.data) : null;
  const board = snapshot ? boardFromSnapshot(snapshot) : emptyBoard();
  try {
    return await prisma.partyDraft.create({
      data: {
        event,
        board: board as object,
        version: 1,
        publishedVersion: 1,
        publishedAt: published?.updatedAt ?? null,
      },
    });
  } catch {
    // Otro request lo creó al mismo tiempo: se usa ese.
    return prisma.partyDraft.findUniqueOrThrow({ where: { event } });
  }
}

export async function loadDraft(event: DraftEventType): Promise<DraftPayload> {
  return toPayload(await ensureDraft(event));
}

/** El borrador solo si cambió respecto de `knownVersion` (null si sigue igual). */
export async function loadDraftIfChanged(event: DraftEventType, knownVersion: number): Promise<DraftPayload | null> {
  const row = await ensureDraft(event);
  return row.version === knownVersion ? null : toPayload(row);
}

/**
 * Aplica un lote de operaciones sobre el tablero vigente. Control
 * optimista: se escribe solo si nadie escribió entre la lectura y la
 * escritura; si alguien lo hizo, se vuelve a leer y se reaplican las
 * operaciones sobre su tablero, así ningún cambio pisa al otro.
 */
export async function applyDraftOpsToDb(
  event: DraftEventType,
  ops: readonly DraftOp[],
  editorName: string
): Promise<{ draft: DraftPayload; errors: string[] }> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const row = await ensureDraft(event);
    const current = readBoard(row.board) ?? emptyBoard();
    const errors: string[] = [];
    let board = current;
    for (const op of ops) {
      const result = applyDraftOp(board, op);
      board = result.board;
      if (result.error) errors.push(result.error);
    }

    // Nada cambió (por ejemplo, todo se rechazó): no se sube la versión.
    if (JSON.stringify(board) === JSON.stringify(current)) return { draft: toPayload(row), errors };

    const { count } = await prisma.partyDraft.updateMany({
      where: { event, version: row.version },
      data: { board: board as object, version: row.version + 1, updatedByName: editorName },
    });
    if (count === 1) {
      const saved = await prisma.partyDraft.findUniqueOrThrow({ where: { event } });
      return { draft: toPayload(saved), errors };
    }
    // Pequeña espera aleatoria para no chocar de nuevo con el mismo escritor.
    await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 60));
  }
  throw new Error("El borrador está recibiendo muchos cambios a la vez. Intenta de nuevo.");
}

/** Marca la versión `version` del borrador como la publicada. */
export async function markDraftPublished(event: DraftEventType, version: number, publisherName: string): Promise<void> {
  await ensureDraft(event);
  await prisma.partyDraft.update({
    where: { event },
    data: { publishedVersion: version, publishedAt: new Date(), publishedByName: publisherName },
  });
}

/** Registra que ese oficial tiene el Party Builder abierto en ese tipo de evento. */
export async function touchEditor(discordId: string, name: string, event: DraftEventType): Promise<void> {
  const lastSeenAt = new Date();
  await prisma.partyDraftEditor.upsert({
    where: { discordId },
    create: { discordId, name, event, lastSeenAt },
    update: { name, event, lastSeenAt },
  });
}

/** Los demás oficiales con la página abierta en los últimos segundos. */
export async function listOtherEditors(discordId: string): Promise<DraftEditor[]> {
  const rows = await prisma.partyDraftEditor.findMany({
    where: { discordId: { not: discordId }, lastSeenAt: { gte: new Date(Date.now() - PRESENCE_WINDOW_MS) } },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({ name: row.name, event: row.event as DraftEventType }));
}

/** Nombre con que se muestra a un oficial en la presencia y en "último cambio de". */
export async function editorDisplayName(discordId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { globalName: true, username: true },
  });
  return user?.globalName || user?.username || "Oficial";
}
