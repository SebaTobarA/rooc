import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { DRAFT_EVENT_TYPES, type DraftEventType } from "@/lib/party/draft-ops";
import { editorDisplayName, listOtherEditors, loadDraftIfChanged, touchEditor } from "@/lib/party/draft";

/**
 * Consulta periódica del Party Builder (cada ~2,5 s con la pestaña
 * visible): devuelve el borrador compartido solo si cambió desde la versión
 * que tiene el cliente (`v`), y quién más lo está editando. Es una ruta y no
 * una server action porque Next.js despacha las server actions de a una por
 * cliente: así la consulta no espera detrás de los cambios que se están
 * enviando, ni al revés.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.discordId) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const permissions = await getEffectivePermissions(session);
  if (!permissions.canManageParty) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const event = params.get("event") as DraftEventType | null;
  if (!event || !DRAFT_EVENT_TYPES.includes(event)) {
    return NextResponse.json({ error: "Tipo de evento inválido." }, { status: 400 });
  }
  const knownVersion = Number(params.get("v") ?? "0");

  const discordId = session.discordId;
  const name = await editorDisplayName(discordId);
  const [draft, editors] = await Promise.all([
    loadDraftIfChanged(event, Number.isInteger(knownVersion) ? knownVersion : 0),
    listOtherEditors(discordId),
    touchEditor(discordId, name, event),
  ]);

  return NextResponse.json({ draft, editors }, { headers: { "Cache-Control": "no-store" } });
}
